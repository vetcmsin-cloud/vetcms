// This file only exports the default pathogen list.
// It is imported by server/seed.ts for database seeding on startup.
// Do NOT add any top-level executable code (like seed() calls) here,
// as this file is imported as a module and any top-level calls would
// run on every import, breaking the server.

export const defaultPathogens = [
  // Canine
  { species: "Canine", name: "Babesia canis" },
  { species: "Canine", name: "Babesia gibsoni" },
  { species: "Canine", name: "Leishmania infantum" },
  { species: "Canine", name: "Hepatozoon americanum" },
  { species: "Canine", name: "Anaplasma phagocytophilum" },
  { species: "Canine", name: "Ehrlichia canis" },
  { species: "Canine", name: "Giardia duodenalis" },
  { species: "Canine", name: "Cystoisospora canis" },
  { species: "Canine", name: "Trypanosoma cruzi" },
  // Feline
  { species: "Feline", name: "Toxoplasma gondii" },
  { species: "Feline", name: "Cytauxzoon felis" },
  { species: "Feline", name: "Mycoplasma haemofelis" },
  { species: "Feline", name: "Babesia felis" },
  { species: "Feline", name: "Tritrichomonas foetus" },
  { species: "Feline", name: "Giardia duodenalis" },
  // Bovine
  { species: "Bovine", name: "Babesia bovis / B. bigemina" },
  { species: "Bovine", name: "Theileria parva / T. annulata" },
  { species: "Bovine", name: "Trypanosoma vivax / T. congolense" },
  { species: "Bovine", name: "Anaplasma marginale" },
  { species: "Bovine", name: "Neospora caninum" },
  { species: "Bovine", name: "Cryptosporidium parvum" },
  // Caprine / Ovine
  { species: "Caprine", name: "Babesia ovis / B. motasi" },
  { species: "Caprine", name: "Theileria ovis / T. lestoquardi" },
  { species: "Caprine", name: "Trypanosoma melophagium" },
  { species: "Caprine", name: "Anaplasma ovis" },
  { species: "Caprine", name: "Eimeria arloingi / E. christenseni" },
  { species: "Caprine", name: "Cryptosporidium parvum" },
  // Equine
  { species: "Equine", name: "Theileria equi / Babesia caballi" },
  { species: "Equine", name: "Trypanosoma evansi" },
  { species: "Equine", name: "Sarcocystis neurona" },
  { species: "Equine", name: "Anaplasma phagocytophilum" },
  { species: "Equine", name: "Klossiella equi" },
  // Avian
  { species: "Avian", name: "Plasmodium gallinaceum" },
  { species: "Avian", name: "Leucocytozoon simondi" },
  { species: "Avian", name: "Haemoproteus columbae" },
  { species: "Avian", name: "Eimeria tenella / E. necatrix" },
  { species: "Avian", name: "Histomonas meleagridis" },
  // Porcine
  { species: "Porcine", name: "Babesia trautmanni" },
  { species: "Porcine", name: "Trypanosoma brucei" },
  { species: "Porcine", name: "Isospora suis" },
  { species: "Porcine", name: "Cryptosporidium parvum" },
  { species: "Porcine", name: "Toxoplasma gondii" },
  // Lagomorph
  { species: "Lagomorph", name: "Encephalitozoon cuniculi" },
  { species: "Lagomorph", name: "Eimeria stiedae" },
  { species: "Lagomorph", name: "Toxoplasma gondii" },
  { species: "Lagomorph", name: "Trypanosoma nabiasi" },
];

