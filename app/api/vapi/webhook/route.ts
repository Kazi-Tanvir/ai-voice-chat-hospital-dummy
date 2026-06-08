import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// ─── Helper: parse tool call arguments (string or object) ───
function parseArgs(args: unknown): Record<string, unknown> {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return (args as Record<string, unknown>) || {};
}

// ─── Helper: fuzzy-find a doctor by name ───
async function findDoctorByName(doctorName: string) {
  const searchName = doctorName.replace(/^(Dr\.?\s*|Doctor\s*)/i, '').trim();
  return prisma.doctor.findFirst({
    where: { name: { contains: searchName } },
    include: { schedules: true },
  });
}

// ─── Helper: validate day against doctor schedules ───
function validateDay(doctor: Awaited<ReturnType<typeof findDoctorByName>>, day: string) {
  if (!doctor) return null;
  return doctor.schedules.find((s) => s.day.toLowerCase() === day.toLowerCase()) || null;
}

// ─── Helper: validate & fuzzy-match a time slot within a schedule ───
function matchTimeSlot(schedule: { timeSlots: string }, timeSlot: string) {
  const slots = schedule.timeSlots.split(',').map((s) => s.trim());
  return (
    slots.find(
      (s) =>
        s.toLowerCase() === timeSlot.toLowerCase() ||
        s.toLowerCase().includes(timeSlot.toLowerCase()) ||
        timeSlot.toLowerCase().includes(s.toLowerCase())
    ) || null
  );
}

// ─── Tool handler: getDoctorSchedule ───
async function handleGetDoctorSchedule(args: Record<string, unknown>) {
  const { searchQuery, searchType } = args as {
    searchQuery?: string;
    searchType?: 'name' | 'specialty' | 'all';
  };

  try {
    let doctors;

    if (searchType === 'all' || (!searchQuery && !searchType)) {
      // Return all active doctors with their schedules
      doctors = await prisma.doctor.findMany({
        where: { isActive: true },
        include: { schedules: true },
        orderBy: { field: 'asc' },
      });
    } else if (searchType === 'specialty' && searchQuery) {
      // Search by specialty/field
      doctors = await prisma.doctor.findMany({
        where: {
          isActive: true,
          field: { contains: searchQuery },
        },
        include: { schedules: true },
      });
    } else if (searchQuery) {
      // Search by name (default if searchType is 'name' or not specified)
      const searchName = searchQuery.replace(/^(Dr\.?\s*|Doctor\s*)/i, '').trim();
      doctors = await prisma.doctor.findMany({
        where: {
          isActive: true,
          name: { contains: searchName },
        },
        include: { schedules: true },
      });
    } else {
      return 'Error: Please provide a search query (doctor name or specialty).';
    }

    if (!doctors || doctors.length === 0) {
      return `No doctors found matching "${searchQuery || 'all'}". Please try a different search term.`;
    }

    // Format the response
    const result = doctors.map((doc) => {
      const scheduleStr = doc.schedules
        .map((s) => `${s.day}: ${s.timeSlots}`)
        .join(' | ');
      return `- ${doc.name} (${doc.field}, ${doc.experienceYears || '?'} yrs exp): Schedule: ${scheduleStr || 'No schedule available'}`;
    }).join('\n');

    return `Found ${doctors.length} doctor(s):\n${result}`;
  } catch (error) {
    console.error('getDoctorSchedule error:', error);
    return 'Error: Could not retrieve doctor information from the database. Please try again.';
  }
}

// ─── Tool handler: bookAppointment ───
async function handleBookAppointment(args: Record<string, unknown>) {
  const { patientName, doctorName, day, timeSlot } = args as {
    patientName?: string;
    doctorName?: string;
    day?: string;
    timeSlot?: string;
  };

  if (!patientName || !doctorName || !day || !timeSlot) {
    return 'Error: Missing some details. I need the patient name, the doctor name, the day, and the time slot to book an appointment.';
  }

  // 1. Find doctor
  const doctor = await findDoctorByName(doctorName);
  if (!doctor) {
    return `Error: Practitioner "${doctorName}" was not found. Please specify another doctor.`;
  }

  // 2. Validate day
  const workingDay = validateDay(doctor, day);
  if (!workingDay) {
    const availableDays = doctor.schedules.map((s) => s.day).join(', ');
    return `Error: ${doctor.name} is not available on ${day}. Their available days are: ${availableDays}.`;
  }

  // 3. Validate time slot
  const matched = matchTimeSlot(workingDay, timeSlot);
  if (!matched) {
    return `Error: The slot "${timeSlot}" is invalid for ${doctor.name} on ${workingDay.day}. Available times are: ${workingDay.timeSlots}.`;
  }

  // 4. Prevent double booking
  const doubleBooked = await prisma.appointment.findFirst({
    where: { doctorId: doctor.id, day: workingDay.day, timeSlot: matched },
  });
  if (doubleBooked) {
    return `Error: The slot ${matched} on ${workingDay.day} with ${doctor.name} is already booked. Please choose another slot.`;
  }

  // 5. Book
  await prisma.appointment.create({
    data: {
      doctorId: doctor.id,
      patientName: patientName as string,
      day: workingDay.day,
      timeSlot: matched,
    },
  });

  return `Success: Appointment booked successfully for ${patientName} with ${doctor.name} on ${workingDay.day} at ${matched}.`;
}

// ─── Tool handler: cancelAppointment ───
async function handleCancelAppointment(args: Record<string, unknown>) {
  const { patientName, doctorName } = args as {
    patientName?: string;
    doctorName?: string;
  };

  if (!patientName) {
    return 'Error: I need the patient name to find the appointment to cancel.';
  }

  // Build search filter
  const where: Record<string, unknown> = {
    patientName: { contains: patientName },
  };

  // Optionally narrow by doctor
  if (doctorName) {
    const doctor = await findDoctorByName(doctorName);
    if (doctor) {
      where.doctorId = doctor.id;
    }
  }

  const matches = await prisma.appointment.findMany({
    where,
    include: { doctor: true },
  });

  if (matches.length === 0) {
    return `Error: No appointment found for patient "${patientName}"${doctorName ? ` with ${doctorName}` : ''}. Please check the details and try again.`;
  }

  if (matches.length > 1) {
    const list = matches
      .map(
        (a, i) =>
          `${i + 1}. ${a.patientName} with ${a.doctor?.name || 'Unknown'} on ${a.day} at ${a.timeSlot}`
      )
      .join('; ');
    return `Multiple appointments found for "${patientName}": ${list}. Please specify the doctor name, day, or time slot so I can identify the correct one.`;
  }

  // Exactly one match — delete it
  const target = matches[0];
  await prisma.appointment.delete({ where: { id: target.id } });

  return `Success: The appointment for ${target.patientName} with ${target.doctor?.name || 'the doctor'} on ${target.day} at ${target.timeSlot} has been cancelled.`;
}

// ─── Tool handler: updateAppointment ───
async function handleUpdateAppointment(args: Record<string, unknown>) {
  const { patientName, doctorName, newDoctorName, newDay, newTimeSlot } = args as {
    patientName?: string;
    doctorName?: string;
    newDoctorName?: string;
    newDay?: string;
    newTimeSlot?: string;
  };

  if (!patientName) {
    return 'Error: I need the patient name to find the appointment to update.';
  }

  if (!newDoctorName && !newDay && !newTimeSlot) {
    return 'Error: Please tell me what you would like to change — the doctor, the day, the time slot, or a combination.';
  }

  // 1. Find the existing appointment
  const where: Record<string, unknown> = {
    patientName: { contains: patientName },
  };
  if (doctorName) {
    const doc = await findDoctorByName(doctorName);
    if (doc) where.doctorId = doc.id;
  }

  const matches = await prisma.appointment.findMany({
    where,
    include: { doctor: { include: { schedules: true } } },
  });

  if (matches.length === 0) {
    return `Error: No appointment found for patient "${patientName}"${doctorName ? ` with ${doctorName}` : ''}. Please check the details.`;
  }

  if (matches.length > 1) {
    const list = matches
      .map(
        (a, i) =>
          `${i + 1}. ${a.patientName} with ${a.doctor?.name || 'Unknown'} on ${a.day} at ${a.timeSlot}`
      )
      .join('; ');
    return `Multiple appointments found for "${patientName}": ${list}. Please specify the doctor name, day, or time slot so I can identify the correct one.`;
  }

  const existing = matches[0];

  // 2. Resolve the target doctor
  let targetDoctor = existing.doctor;
  if (newDoctorName) {
    const found = await findDoctorByName(newDoctorName);
    if (!found) {
      return `Error: Practitioner "${newDoctorName}" was not found. Please specify another doctor.`;
    }
    targetDoctor = found;
  }

  // 3. Determine final day & validate
  const finalDay = newDay || existing.day;
  const workingDay = validateDay(targetDoctor, finalDay);
  if (!workingDay) {
    const availableDays = targetDoctor!.schedules.map((s) => s.day).join(', ');
    return `Error: ${targetDoctor!.name} is not available on ${finalDay}. Available days: ${availableDays}.`;
  }

  // 4. Determine final time slot & validate
  const finalTimeSlot = newTimeSlot || existing.timeSlot;
  const matchedSlot = matchTimeSlot(workingDay, finalTimeSlot);
  if (!matchedSlot) {
    return `Error: The slot "${finalTimeSlot}" is invalid for ${targetDoctor!.name} on ${workingDay.day}. Available times are: ${workingDay.timeSlots}.`;
  }

  // 5. Check double booking (exclude current appointment)
  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: targetDoctor!.id,
      day: workingDay.day,
      timeSlot: matchedSlot,
      id: { not: existing.id },
    },
  });
  if (conflict) {
    return `Error: The slot ${matchedSlot} on ${workingDay.day} with ${targetDoctor!.name} is already booked. Please choose a different slot.`;
  }

  // 6. Update
  await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      doctorId: targetDoctor!.id,
      day: workingDay.day,
      timeSlot: matchedSlot,
    },
  });

  // Build a human-readable summary of what changed
  const changes: string[] = [];
  if (newDoctorName) changes.push(`doctor changed to ${targetDoctor!.name}`);
  if (newDay) changes.push(`day changed to ${workingDay.day}`);
  if (newTimeSlot) changes.push(`time changed to ${matchedSlot}`);

  return `Success: Appointment for ${existing.patientName} has been updated — ${changes.join(', ')}. The appointment is now with ${targetDoctor!.name} on ${workingDay.day} at ${matchedSlot}.`;
}

// ═════════════════════════════════════════════════════════════
// Main webhook handler
// ═════════════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Vapi Webhook Triggered with payload:', JSON.stringify(payload, null, 2));

    const { message } = payload;
    if (!message || message.type !== 'tool-calls') {
      // Vapi expects a 200 for other messages like call.started or assistant.request
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const results = [];

    for (const toolCall of message.toolCalls) {
      const args = parseArgs(toolCall.function.arguments);
      const fnName = toolCall.function.name;
      let result: string;

      switch (fnName) {
        case 'bookAppointment':
          result = await handleBookAppointment(args);
          break;
        case 'cancelAppointment':
          result = await handleCancelAppointment(args);
          break;
        case 'updateAppointment':
          result = await handleUpdateAppointment(args);
          break;
        case 'getDoctorSchedule':
          result = await handleGetDoctorSchedule(args);
          break;
        default:
          result = `Error: Function "${fnName}" is not supported.`;
      }

      results.push({ toolCallId: toolCall.id, result });
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Vapi Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
