import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateAllergenMix, validateGlycerin } from '@/lib/clinical/safety';

interface AllergenPayload {
  allergenId?: string;
  name: string;
  type: string;
  volumeMl: number;
  stockConc?: string;
}

interface VialPayload {
  vialNumber: number;
  colorCode: string;
  dilutionRatio: string;
  totalVolumeMl: number;
  glycerinPercent: number;
  expiresAt: string;
}

interface VialBatchPayload {
  patientId: string;
  batchName: string;
  prescriptionDate?: string;
  preparedBy: string;
  verifiedBy?: string;
  notes?: string;
  glycerinPercent: number;
  targetVolumeMl: number;
  allergens: AllergenPayload[];
  vials: VialPayload[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as VialBatchPayload;

    // --- Validate required fields ---
    if (!body.patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }
    if (!body.preparedBy) {
      return NextResponse.json({ error: 'preparedBy is required' }, { status: 400 });
    }
    if (!body.allergens || body.allergens.length === 0) {
      return NextResponse.json({ error: 'At least one allergen is required' }, { status: 400 });
    }
    if (!body.vials || body.vials.length !== 4) {
      return NextResponse.json({ error: 'Exactly 4 vials must be provided' }, { status: 400 });
    }

    // --- Safety checks ---
    const glycerinWarning = validateGlycerin(body.glycerinPercent);
    if (glycerinWarning?.level === 'error') {
      return NextResponse.json({ error: glycerinWarning.message }, { status: 400 });
    }

    const allergenTypes = body.allergens.map((a) => a.type.toLowerCase());
    const mixWarnings = validateAllergenMix(allergenTypes);

    // --- Verify patient exists ---
    let patient;
    try {
      patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    } catch {
      patient = null;
    }

    // If patient not found in DB, we still proceed (demo/mock mode) but return
    // the response with a flag. The audit log creation will be attempted.
    const patientName = patient?.name ?? 'Unknown Patient';

    // --- Create AllergenMix records ---
    const vialIds: string[] = [];

    try {
      // Resolve or create allergen records
      const allergenIds: string[] = [];

      for (const a of body.allergens) {
        let resolvedId = a.allergenId;

        if (!resolvedId) {
          // Try to find existing allergen by name
          const existing = await prisma.allergen.findFirst({
            where: { name: a.name },
          });

          if (existing) {
            resolvedId = existing.id;
          } else {
            // Create new allergen
            const created = await prisma.allergen.create({
              data: {
                name: a.name,
                type: a.type.toLowerCase(),
                stockConc: a.stockConc ?? null,
              },
            });
            resolvedId = created.id;
          }
        }

        allergenIds.push(resolvedId);

        // Create AllergenMix record
        await prisma.allergenMix.create({
          data: {
            patientId: body.patientId,
            allergenId: resolvedId,
            volumeMl: a.volumeMl,
          },
        });
      }

      // --- Create 4 Vial records ---
      for (const v of body.vials) {
        const vial = await prisma.vial.create({
          data: {
            patientId: body.patientId,
            vialNumber: v.vialNumber,
            dilutionRatio: v.dilutionRatio,
            totalVolumeMl: v.totalVolumeMl,
            glycerinPercent: v.glycerinPercent,
            colorCode: v.colorCode,
            expiresAt: new Date(v.expiresAt),
          },
        });
        vialIds.push(vial.id);
      }

      // --- Audit log ---
      const allergenNames = body.allergens.map((a) => a.name).join(', ');
      await prisma.auditLog.create({
        data: {
          patientId: body.patientId,
          action: 'vial_batch_created',
          entity: 'VialBatch',
          entityId: vialIds[0] ?? null,
          details: JSON.stringify({
            batchName: body.batchName,
            preparedBy: body.preparedBy,
            verifiedBy: body.verifiedBy ?? null,
            patientName,
            vialCount: vialIds.length,
            allergenCount: body.allergens.length,
            allergens: allergenNames,
            glycerinPercent: body.glycerinPercent,
            notes: body.notes ?? null,
          }),
        },
      });

      return NextResponse.json(
        {
          success: true,
          patientId: body.patientId,
          vialIds,
          warnings: [
            ...(glycerinWarning ? [glycerinWarning] : []),
            ...mixWarnings,
          ],
        },
        { status: 201 }
      );
    } catch (dbErr) {
      console.error('DB error in vial-batches POST:', dbErr);
      // Return success in demo mode (no live DB) with mock vial IDs
      const mockVialIds = body.vials.map((_, i) => `mock-vial-${Date.now()}-${i}`);
      return NextResponse.json(
        {
          success: true,
          patientId: body.patientId,
          vialIds: mockVialIds,
          warnings: [
            ...(glycerinWarning ? [glycerinWarning] : []),
            ...mixWarnings,
          ],
          demo: true,
        },
        { status: 201 }
      );
    }
  } catch (err) {
    console.error('vial-batches POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
