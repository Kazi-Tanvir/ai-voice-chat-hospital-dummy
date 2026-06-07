import prisma from '../lib/prisma';

const doctorsData = [
  {
    name: 'Dr. John Doe',
    field: 'Cardiology',
    medicalStudy: 'MD, Harvard Medical School',
    researchBackground: '15 years research in cardiovascular diseases and heart failure management.',
    email: 'john.doe@hospital.com',
    phone: '+1-555-0199',
    experienceYears: 18,
    bio: 'A leading cardiologist specializing in interventional cardiology and preventive cardiovascular medicine.',
    schedules: [
      { day: 'Saturday', timeSlots: '8:30 AM - 11:20 AM, 6:00 PM - 9:00 PM' },
      { day: 'Sunday', timeSlots: '8:30 AM - 11:20 AM, 6:00 PM - 9:00 PM' },
      { day: 'Wednesday', timeSlots: '8:30 AM - 11:20 AM' },
    ],
  },
  {
    name: 'Dr. Jane Smith',
    field: 'Pediatrics',
    medicalStudy: 'MD, Johns Hopkins University',
    researchBackground: '10 years clinical research in pediatric allergy and asthma immunology.',
    email: 'jane.smith@hospital.com',
    phone: '+1-555-0244',
    experienceYears: 12,
    bio: 'Dedicated pediatrician focused on providing compassionate care for children and adolescents.',
    schedules: [
      { day: 'Monday', timeSlots: '9:00 AM - 12:00 PM' },
      { day: 'Wednesday', timeSlots: '1:00 PM - 5:00 PM' },
      { day: 'Friday', timeSlots: '9:00 AM - 12:00 PM' },
    ],
  },
  {
    name: 'Dr. Alex Patel',
    field: 'Neurology',
    medicalStudy: 'PhD & MD, Stanford University School of Medicine',
    researchBackground: 'Extensive research on neural plasticity, cognitive rehabilitation, and Alzheimer\'s disease.',
    email: 'alex.patel@hospital.com',
    phone: '+1-555-0377',
    experienceYears: 15,
    bio: 'Neurologist with dual clinical and research expertise, specializing in neuromuscular disorders and neurodegenerative conditions.',
    schedules: [
      { day: 'Tuesday', timeSlots: '10:00 AM - 1:00 PM' },
      { day: 'Thursday', timeSlots: '2:00 PM - 6:00 PM' },
    ],
  },
  {
    name: 'Dr. Sarah Jenkins',
    field: 'Dermatology',
    medicalStudy: 'MD, Yale School of Medicine',
    researchBackground: 'Research on melanoma biomarkers and advanced laser therapies for skin rejuvenation.',
    email: 'sarah.jenkins@hospital.com',
    phone: '+1-555-0412',
    experienceYears: 8,
    bio: 'Board-certified dermatologist specializing in both clinical dermatology and aesthetic skin treatments.',
    schedules: [
      { day: 'Monday', timeSlots: '8:30 AM - 12:30 PM' },
      { day: 'Tuesday', timeSlots: '1:30 PM - 5:00 PM' },
      { day: 'Thursday', timeSlots: '8:30 AM - 12:30 PM' },
    ],
  },
  {
    name: 'Dr. Robert Chen',
    field: 'Orthopedics',
    medicalStudy: 'MD, Columbia University Vagelos College of Physicians and Surgeons',
    researchBackground: 'Clinical trials on minimally invasive joint replacement techniques and cartilage regeneration.',
    email: 'robert.chen@hospital.com',
    phone: '+1-555-0567',
    experienceYears: 20,
    bio: 'Orthopedic surgeon focusing on sports medicine, complex joint reconstruction, and arthroscopic surgery.',
    schedules: [
      { day: 'Wednesday', timeSlots: '9:00 AM - 1:00 PM, 3:00 PM - 6:00 PM' },
      { day: 'Friday', timeSlots: '9:00 AM - 2:00 PM' },
    ],
  },
  {
    name: 'Dr. Emily Watson',
    field: 'Oncology',
    medicalStudy: 'MD, University of Pennsylvania Perelman School of Medicine',
    researchBackground: 'Translational research in targeted immunotherapies for lung and breast cancer.',
    email: 'emily.watson@hospital.com',
    phone: '+1-555-0688',
    experienceYears: 14,
    bio: 'Oncologist dedicated to offering personalized, state-of-the-art cancer treatments and clinical trial options.',
    schedules: [
      { day: 'Monday', timeSlots: '10:00 AM - 4:00 PM' },
      { day: 'Wednesday', timeSlots: '10:00 AM - 4:00 PM' },
    ],
  },
  {
    name: 'Dr. Michael Chang',
    field: 'Psychiatry',
    medicalStudy: 'MD, UCSF School of Medicine',
    researchBackground: 'Research on neuroimaging correlates of mood disorders and refractory depression treatment.',
    email: 'michael.chang@hospital.com',
    phone: '+1-555-0711',
    experienceYears: 11,
    bio: 'Psychiatrist specializing in psychopharmacology, cognitive behavioral therapy, and stress management.',
    schedules: [
      { day: 'Tuesday', timeSlots: '9:00 AM - 12:00 PM, 2:00 PM - 5:00 PM' },
      { day: 'Friday', timeSlots: '9:00 AM - 12:00 PM' },
    ],
  },
  {
    name: 'Dr. Linda Ross',
    field: 'Gastroenterology',
    medicalStudy: 'MD, Duke University School of Medicine',
    researchBackground: 'Studies on gut microbiome variations in inflammatory bowel diseases (IBD).',
    email: 'linda.ross@hospital.com',
    phone: '+1-555-0822',
    experienceYears: 16,
    bio: 'Gastroenterologist expert in advanced endoscopy, colonoscopy, liver disorders, and chronic IBS management.',
    schedules: [
      { day: 'Monday', timeSlots: '1:00 PM - 5:00 PM' },
      { day: 'Thursday', timeSlots: '9:00 AM - 1:00 PM' },
    ],
  },
  {
    name: 'Dr. David Kim',
    field: 'Ophthalmology',
    medicalStudy: 'MD, Washington University School of Medicine',
    researchBackground: 'Research on retinal gene therapy and progressive diabetic retinopathy treatments.',
    email: 'david.kim@hospital.com',
    phone: '+1-555-0933',
    experienceYears: 10,
    bio: 'Ophthalmologist specializing in cataract surgery, refractive LASIK, and macular degeneration treatment.',
    schedules: [
      { day: 'Wednesday', timeSlots: '8:00 AM - 12:00 PM' },
      { day: 'Friday', timeSlots: '1:00 PM - 5:00 PM' },
    ],
  },
  {
    name: 'Dr. Angela Martinez',
    field: 'Gynecology',
    medicalStudy: 'MD, Northwestern University Feinberg School of Medicine',
    researchBackground: 'Research in maternal-fetal medicine, high-risk pregnancy protocols, and laparoscopic surgery.',
    email: 'angela.martinez@hospital.com',
    phone: '+1-555-1044',
    experienceYears: 13,
    bio: 'Compassionate gynecologist and obstetrician offering comprehensive women health services.',
    schedules: [
      { day: 'Tuesday', timeSlots: '8:30 AM - 4:30 PM' },
      { day: 'Thursday', timeSlots: '8:30 AM - 4:30 PM' },
    ],
  },
  {
    name: 'Dr. James Wilson',
    field: 'Endocrinology',
    medicalStudy: 'MD, University of Chicago Pritzker School of Medicine',
    researchBackground: 'Clinical research on continuous glucose monitoring technologies and thyroid nodule evaluation.',
    email: 'james.wilson@hospital.com',
    phone: '+1-555-1155',
    experienceYears: 17,
    bio: 'Endocrinologist managing type 1 & 2 diabetes, metabolic syndromes, and complex pituitary/adrenal disorders.',
    schedules: [
      { day: 'Monday', timeSlots: '9:00 AM - 1:00 PM' },
      { day: 'Wednesday', timeSlots: '1:00 PM - 5:00 PM' },
    ],
  },
  {
    name: 'Dr. Patricia Taylor',
    field: 'Otolaryngology',
    medicalStudy: 'MD, Vanderbilt University School of Medicine',
    researchBackground: 'Investigating outcomes of cochlear implants and endoscopic sinus surgery innovations.',
    email: 'patricia.taylor@hospital.com',
    phone: '+1-555-1266',
    experienceYears: 15,
    bio: 'Ear, Nose, and Throat (ENT) specialist with extensive experience in pediatric ENT and skull base surgeries.',
    schedules: [
      { day: 'Tuesday', timeSlots: '9:00 AM - 12:00 PM, 2:00 PM - 5:00 PM' },
      { day: 'Thursday', timeSlots: '9:00 AM - 12:00 PM' },
    ],
  },
  {
    name: 'Dr. Thomas Anderson',
    field: 'Urology',
    medicalStudy: 'MD, Cornell University Weill Medical College',
    researchBackground: 'Development of robotic prostatectomy protocols and kidney stone prevention therapies.',
    email: 'thomas.anderson@hospital.com',
    phone: '+1-555-1377',
    experienceYears: 19,
    bio: 'Urologist specializing in robotic-assisted surgeries, male infertility, and complex urinary tract disorders.',
    schedules: [
      { day: 'Wednesday', timeSlots: '10:00 AM - 3:00 PM' },
      { day: 'Friday', timeSlots: '10:00 AM - 3:00 PM' },
    ],
  },
  {
    name: 'Dr. Karen White',
    field: 'Rheumatology',
    medicalStudy: 'MD, Boston University School of Medicine',
    researchBackground: 'Biologic treatment optimization for severe rheumatoid arthritis and systemic lupus.',
    email: 'karen.white@hospital.com',
    phone: '+1-555-1488',
    experienceYears: 9,
    bio: 'Rheumatologist specializing in chronic autoimmune diseases, gout, osteoarthritis, and joint injections.',
    schedules: [
      { day: 'Monday', timeSlots: '8:30 AM - 11:30 AM' },
      { day: 'Thursday', timeSlots: '1:30 PM - 4:30 PM' },
    ],
  },
  {
    name: 'Dr. Brian Hall',
    field: 'Pulmonology',
    medicalStudy: 'MD, University of Michigan Medical School',
    researchBackground: 'Research on COPD exacerbation triggers and interstitial lung disease diagnostic advances.',
    email: 'brian.hall@hospital.com',
    phone: '+1-555-1599',
    experienceYears: 14,
    bio: 'Pulmonologist and critical care specialist treating asthma, sleep apnea, and acute respiratory distress.',
    schedules: [
      { day: 'Tuesday', timeSlots: '9:00 AM - 1:00 PM' },
      { day: 'Friday', timeSlots: '9:00 AM - 1:00 PM' },
    ],
  },
  {
    name: 'Dr. Susan Green',
    field: 'Nephrology',
    medicalStudy: 'MD, University of Pittsburgh School of Medicine',
    researchBackground: 'Research on slowing progression of diabetic nephropathy and home hemodialysis outcomes.',
    email: 'susan.green@hospital.com',
    phone: '+1-555-1610',
    experienceYears: 11,
    bio: 'Nephrologist focused on chronic kidney disease, hypertension management, and kidney transplantation care.',
    schedules: [
      { day: 'Wednesday', timeSlots: '9:30 AM - 1:30 PM' },
      { day: 'Friday', timeSlots: '1:30 PM - 5:30 PM' },
    ],
  },
  {
    name: 'Dr. Kevin Harris',
    field: 'Neurology',
    medicalStudy: 'MD, NYU Grossman School of Medicine',
    researchBackground: 'Clinical research in acute stroke therapies and modern epilepsy management.',
    email: 'kevin.harris@hospital.com',
    phone: '+1-555-1721',
    experienceYears: 13,
    bio: 'Neurologist specialized in movement disorders, Parkinson\'s disease, migraine prevention, and EEG analysis.',
    schedules: [
      { day: 'Monday', timeSlots: '10:00 AM - 1:00 PM, 3:00 PM - 5:00 PM' },
      { day: 'Wednesday', timeSlots: '10:00 AM - 1:00 PM' },
    ],
  },
  {
    name: 'Dr. Lisa Young',
    field: 'Allergy & Immunology',
    medicalStudy: 'MD, Mount Sinai Icahn School of Medicine',
    researchBackground: 'Clinical research on immunotherapy protocols for peanut allergies in toddlers.',
    email: 'lisa.young@hospital.com',
    phone: '+1-555-1832',
    experienceYears: 7,
    bio: 'Allergist diagnosing and treating food allergies, seasonal eczema, asthma, and primary immunodeficiency.',
    schedules: [
      { day: 'Tuesday', timeSlots: '8:30 AM - 12:30 PM' },
      { day: 'Friday', timeSlots: '8:30 AM - 12:30 PM' },
    ],
  },
  {
    name: 'Dr. Jason Patel',
    field: 'Cardiology',
    medicalStudy: 'MD, Baylor College of Medicine',
    researchBackground: 'Research in preventative cardiology, hypertension controls, and coronary artery disease tracking.',
    email: 'jason.patel@hospital.com',
    phone: '+1-555-1943',
    experienceYears: 15,
    bio: 'Non-invasive cardiologist focusing on cardiac imaging, echocardiography, and lifestyle heart disease risk reduction.',
    schedules: [
      { day: 'Tuesday', timeSlots: '9:00 AM - 12:30 PM' },
      { day: 'Thursday', timeSlots: '1:30 PM - 5:00 PM' },
    ],
  },
  {
    name: 'Dr. Helen Carter',
    field: 'Hematology',
    medicalStudy: 'MD, Emory University School of Medicine',
    researchBackground: 'Research on clotting factor behaviors and novel sickle cell anemia gene editing studies.',
    email: 'helen.carter@hospital.com',
    phone: '+1-555-2054',
    experienceYears: 12,
    bio: 'Hematologist expert in coagulation disorders, leukemia, lymphoma, and various forms of severe anemia.',
    schedules: [
      { day: 'Monday', timeSlots: '9:00 AM - 2:00 PM' },
      { day: 'Thursday', timeSlots: '9:00 AM - 2:00 PM' },
    ],
  },
  {
    name: 'Dr. Richard Vance',
    field: 'Infectious Disease',
    medicalStudy: 'MD, Georgetown University School of Medicine',
    researchBackground: 'Epidemiological tracking of drug-resistant pathogens and global tropical disease outbreaks.',
    email: 'richard.vance@hospital.com',
    phone: '+1-555-2165',
    experienceYears: 16,
    bio: 'Infectious disease specialist consulting on complex hospital infections, HIV/AIDS care, and travel medicine.',
    schedules: [
      { day: 'Wednesday', timeSlots: '1:00 PM - 5:00 PM' },
      { day: 'Friday', timeSlots: '8:00 AM - 12:00 PM' },
    ],
  },
  {
    name: 'Dr. Amanda Scott',
    field: 'Geriatrics',
    medicalStudy: 'MD, University of Virginia School of Medicine',
    researchBackground: 'Research in polypharmacy reduction and dementia-friendly healthcare system models.',
    email: 'amanda.scott@hospital.com',
    phone: '+1-555-2276',
    experienceYears: 10,
    bio: 'Geriatrician specialized in managing complex medical issues, physical frailty, and memory health in seniors.',
    schedules: [
      { day: 'Monday', timeSlots: '8:30 AM - 4:00 PM' },
      { day: 'Wednesday', timeSlots: '8:30 AM - 12:30 PM' },
    ],
  },
  {
    name: 'Dr. Daniel Brooks',
    field: 'Sports Medicine',
    medicalStudy: 'MD, Ohio State University College of Medicine',
    researchBackground: 'Studies on ultrasound-guided tendon injections and biomechanics of runner injury prevention.',
    email: 'daniel.brooks@hospital.com',
    phone: '+1-555-2387',
    experienceYears: 8,
    bio: 'Non-surgical sports medicine physician helping athletes of all levels recover from muscle, joint, and tendon injuries.',
    schedules: [
      { day: 'Tuesday', timeSlots: '9:00 AM - 5:00 PM' },
      { day: 'Thursday', timeSlots: '9:00 AM - 12:00 PM' },
    ],
  },
  {
    name: 'Dr. Melissa Lopez',
    field: 'Pediatrics',
    medicalStudy: 'MD, UT Southwestern Medical School',
    researchBackground: 'Research in childhood development milestones and nutritional obesity prevention in low-income areas.',
    email: 'melissa.lopez@hospital.com',
    phone: '+1-555-2498',
    experienceYears: 11,
    bio: 'General pediatrician offering developmental screenings, immunizations, and holistic preventative care.',
    schedules: [
      { day: 'Wednesday', timeSlots: '8:30 AM - 12:30 PM' },
      { day: 'Friday', timeSlots: '1:00 PM - 5:00 PM' },
    ],
  },
  {
    name: 'Dr. Gregory House',
    field: 'Diagnostic Medicine',
    medicalStudy: 'MD, Johns Hopkins University',
    researchBackground: 'Specialized clinical analysis in rare infectious diseases and nephrology diagnostics.',
    email: 'gregory.house@hospital.com',
    phone: '+1-555-9999',
    experienceYears: 25,
    bio: 'Renowned diagnostician specializing in solving the most challenging, unexplained medical cases.',
    schedules: [
      { day: 'Monday', timeSlots: '11:00 AM - 3:00 PM' },
      { day: 'Wednesday', timeSlots: '11:00 AM - 3:00 PM' },
    ],
  }
];

async function main() {
  console.log('Start seeding...');

  // Clean the database
  await prisma.schedule.deleteMany();
  await prisma.doctor.deleteMany();

  // Seed doctors
  for (const doc of doctorsData) {
    await prisma.doctor.create({
      data: {
        name: doc.name,
        field: doc.field,
        medicalStudy: doc.medicalStudy,
        researchBackground: doc.researchBackground,
        email: doc.email,
        phone: doc.phone,
        experienceYears: doc.experienceYears,
        bio: doc.bio,
        schedules: {
          create: doc.schedules,
        },
      },
    });
  }

  console.log(`Seeding finished. Created ${doctorsData.length} doctor records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
