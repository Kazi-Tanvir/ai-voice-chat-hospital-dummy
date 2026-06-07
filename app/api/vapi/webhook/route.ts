import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Vapi Webhook Triggered with payload:', JSON.stringify(payload, null, 2));

    const { message } = payload;
    if (!message || message.type !== 'tool-calls') {
      // Vapi expects a 201/200 for other messages like call.started or assistant.request
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const results = [];

    for (const toolCall of message.toolCalls) {
      if (toolCall.function.name === 'bookAppointment') {
        let args = toolCall.function.arguments;
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch (e) {
            console.error('Failed to parse arguments JSON string', e);
          }
        }

        const { patientName, doctorName, day, timeSlot } = args;

        if (!patientName || !doctorName || !day || !timeSlot) {
          results.push({
            toolCallId: toolCall.id,
            result: 'Error: Missing some details. I need the patient name, the doctor name, the day, and the time slot to book an appointment.',
          });
          continue;
        }

        // 1. Find the doctor (fuzzy matching to handle "Dr. Name" or just "Name")
        const searchName = doctorName.replace(/^(Dr\.\s*|Doctor\s*)/i, '').trim();
        const doctor = await prisma.doctor.findFirst({
          where: {
            name: {
              contains: searchName,
            },
          },
          include: {
            schedules: true,
          },
        });

        if (!doctor) {
          results.push({
            toolCallId: toolCall.id,
            result: `Error: Practitioner "${doctorName}" was not found. Please specify another doctor.`,
          });
          continue;
        }

        // 2. Validate day
        const workingDay = doctor.schedules.find(
          (s) => s.day.toLowerCase() === day.toLowerCase()
        );
        if (!workingDay) {
          const availableDays = doctor.schedules.map((s) => s.day).join(', ');
          results.push({
            toolCallId: toolCall.id,
            result: `Error: ${doctor.name} is not available on ${day}. Their available days are: ${availableDays}.`,
          });
          continue;
        }

        // 3. Validate time slot
        const timeSlots = workingDay.timeSlots.split(',').map((s) => s.trim());
        const matchedTimeSlot = timeSlots.find(
          (s) =>
            s.toLowerCase() === timeSlot.toLowerCase() ||
            s.toLowerCase().includes(timeSlot.toLowerCase()) ||
            timeSlot.toLowerCase().includes(s.toLowerCase())
        );

        if (!matchedTimeSlot) {
          results.push({
            toolCallId: toolCall.id,
            result: `Error: The slot "${timeSlot}" is invalid for ${doctor.name} on ${workingDay.day}. Available times are: ${workingDay.timeSlots}.`,
          });
          continue;
        }

        // 4. Prevent double booking
        const doubleBooked = await prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            day: workingDay.day,
            timeSlot: matchedTimeSlot,
          },
        });

        if (doubleBooked) {
          results.push({
            toolCallId: toolCall.id,
            result: `Error: The slot ${matchedTimeSlot} on ${workingDay.day} with ${doctor.name} is already booked. Please choose another slot.`,
          });
          continue;
        }

        // 5. Book appointment
        const appointment = await prisma.appointment.create({
          data: {
            doctorId: doctor.id,
            patientName,
            day: workingDay.day,
            timeSlot: matchedTimeSlot,
          },
        });

        results.push({
          toolCallId: toolCall.id,
          result: `Success: Appointment booked successfully for ${patientName} with ${doctor.name} on ${workingDay.day} at ${matchedTimeSlot}.`,
        });
      } else {
        results.push({
          toolCallId: toolCall.id,
          result: `Error: Function "${toolCall.function.name}" is not supported.`,
        });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Vapi Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
