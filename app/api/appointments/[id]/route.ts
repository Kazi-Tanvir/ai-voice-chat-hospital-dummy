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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    // Verify appointment exists
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: { include: { schedules: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { patientName, doctorId, day, timeSlot } = body;

    // Determine final values (use new if provided, otherwise keep existing)
    const finalDoctorId = doctorId || existing.doctorId;
    const finalDay = day || existing.day;
    const finalTimeSlot = timeSlot || existing.timeSlot;
    const finalPatientName = patientName || existing.patientName;

    // If doctor, day, or timeSlot changed, we need to re-validate
    const scheduleChanged =
      finalDoctorId !== existing.doctorId ||
      finalDay !== existing.day ||
      finalTimeSlot !== existing.timeSlot;

    if (scheduleChanged) {
      // Load the target doctor with schedules
      const targetDoctor = await prisma.doctor.findUnique({
        where: { id: finalDoctorId },
        include: { schedules: true },
      });
      if (!targetDoctor) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }

      // Validate day
      const workingDay = targetDoctor.schedules.find(
        (s) => s.day.toLowerCase() === finalDay.toLowerCase()
      );
      if (!workingDay) {
        const availableDays = targetDoctor.schedules.map((s) => s.day).join(', ');
        return NextResponse.json(
          { error: `${targetDoctor.name} is not available on ${finalDay}. Available days: ${availableDays}` },
          { status: 400 }
        );
      }

      // Validate time slot
      const slots = workingDay.timeSlots.split(',').map((s) => s.trim());
      const matchedSlot = slots.find(
        (s) =>
          s.toLowerCase() === finalTimeSlot.toLowerCase() ||
          s.toLowerCase().includes(finalTimeSlot.toLowerCase()) ||
          finalTimeSlot.toLowerCase().includes(s.toLowerCase())
      );
      if (!matchedSlot) {
        return NextResponse.json(
          { error: `Invalid time slot "${finalTimeSlot}" for ${targetDoctor.name} on ${workingDay.day}. Available: ${workingDay.timeSlots}` },
          { status: 400 }
        );
      }

      // Check double booking (exclude current appointment)
      const conflict = await prisma.appointment.findFirst({
        where: {
          doctorId: finalDoctorId,
          day: workingDay.day,
          timeSlot: matchedSlot,
          id: { not: id },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `The slot ${matchedSlot} on ${workingDay.day} with ${targetDoctor.name} is already booked.` },
          { status: 409 }
        );
      }

      // Update with validated values
      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          doctorId: finalDoctorId,
          patientName: finalPatientName,
          day: workingDay.day,
          timeSlot: matchedSlot,
        },
        include: { doctor: true },
      });

      return NextResponse.json(updated);
    }

    // Only patientName changed (or nothing changed)
    const updated = await prisma.appointment.update({
      where: { id },
      data: { patientName: finalPatientName },
      include: { doctor: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}
