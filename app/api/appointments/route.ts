import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        doctor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doctorId, patientName, day, timeSlot } = body;

    if (!doctorId || !patientName || !day || !timeSlot) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientName,
        day,
        timeSlot,
      },
      include: {
        doctor: true,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Failed to create appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
