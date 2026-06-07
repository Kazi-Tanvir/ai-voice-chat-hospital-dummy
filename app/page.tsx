import prisma from '../lib/prisma';
import SchedulingClient from './SchedulingClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CareConnect Clinic Scheduler',
  description: 'Schedule and manage appointments with clinic practitioners.',
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch doctors and their schedules
  const doctors = await prisma.doctor.findMany({
    include: {
      schedules: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch appointments and include their doctor association
  const appointments = await prisma.appointment.findMany({
    include: {
      doctor: {
        include: {
          schedules: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <SchedulingClient
      initialDoctors={doctors}
      initialAppointments={appointments}
    />
  );
}
