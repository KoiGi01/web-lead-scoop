export interface MockLead {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: boolean;
  linkedin: boolean;
  score: number;
}

export const MOCK_QUERY = "dentists in Madrid";

export const MOCK_LEADS: MockLead[] = [
  {
    id: "1",
    name: "Clínica Dental Sant'Esteban",
    category: "Dental clinic",
    address: "Calle de Velázquez 42, Madrid",
    phone: "+34 914 23 18 90",
    email: "info@dentalsantesteban.es",
    whatsapp: true,
    linkedin: true,
    score: 87,
  },
  {
    id: "2",
    name: "Sonrisa Madrid Dental",
    category: "Dental clinic",
    address: "Gran Vía 28, Madrid",
    phone: "+34 915 21 04 67",
    email: "contacto@sonrisamadrid.com",
    whatsapp: true,
    linkedin: false,
    score: 73,
  },
  {
    id: "3",
    name: "Dr. Ramírez Odontología",
    category: "Dental specialist",
    address: "Calle de Serrano 110, Madrid",
    phone: "+34 913 76 09 44",
    email: "consulta@dr-ramirez.es",
    whatsapp: true,
    linkedin: true,
    score: 91,
  },
  {
    id: "4",
    name: "Centro Odontológico Chamberí",
    category: "Dental clinic",
    address: "Calle de Fuencarral 154, Madrid",
    phone: "+34 917 02 56 23",
    email: "info@odontochamberi.com",
    whatsapp: false,
    linkedin: true,
    score: 68,
  },
  {
    id: "5",
    name: "Implantes Dentales Madrid",
    category: "Dental specialist",
    address: "Paseo de la Castellana 89, Madrid",
    phone: "+34 914 47 81 32",
    email: "info@implantesmadrid.es",
    whatsapp: true,
    linkedin: true,
    score: 82,
  },
  {
    id: "6",
    name: "Ortodoncia Salamanca",
    category: "Orthodontist",
    address: "Calle de Goya 67, Madrid",
    phone: "+34 916 12 90 18",
    email: "hola@ortosalamanca.com",
    whatsapp: false,
    linkedin: false,
    score: 65,
  },
  {
    id: "7",
    name: "Estética Dental Retiro",
    category: "Dental clinic",
    address: "Calle de Alcalá 142, Madrid",
    phone: "+34 915 84 27 11",
    email: "citas@esteticaretiro.es",
    whatsapp: true,
    linkedin: true,
    score: 79,
  },
  {
    id: "8",
    name: "Vista Dental Atocha",
    category: "Dental clinic",
    address: "Calle de Atocha 78, Madrid",
    phone: "+34 913 54 06 92",
    email: "contacto@vistadental.es",
    whatsapp: true,
    linkedin: false,
    score: 71,
  },
];

export const FEATURED_LEAD = MOCK_LEADS[2];

export const MOCK_INTELLIGENCE = {
  leadName: FEATURED_LEAD.name,
  score: FEATURED_LEAD.score,
  maturity: "Established",
  positioning: "Premium implant specialist",
  pitch:
    "Mid-sized clinic with strong reviews but no booking widget. Pitch online appointments + WhatsApp lead capture — likely 30% no-show reduction.",
  issues: ["No online booking", "Slow mobile load", "Missing schema markup"],
};
