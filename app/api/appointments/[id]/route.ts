import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    await prisma.appointment.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Failed to cancel appointment:', error);
    return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
  }
}
