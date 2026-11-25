import { run } from "./db";
import { insertBusiness } from "./businesses";

const SAMPLES = [
  { name: "Bay Avenue Barbers", category: "Barber shop", profile: "beauty", street: "512 Bay Ave", city: "Somers Point", zip: "08244", email: "" },
  { name: "Gina's Pizzeria & Grill", category: "Pizza restaurant", profile: "food", street: "820 Shore Rd", city: "Somers Point", zip: "08244", email: "ginas.pizza.sample@example.com" },
  { name: "Wildwood Boat & Engine Repair", category: "Boat repair shop", profile: "auto", street: "3301 Park Blvd", city: "Wildwood", zip: "08260", email: "" },
  { name: "Franklin Ave Tailoring", category: "Tailor", profile: "retail", street: "245 Franklin Ave", city: "Nutley", zip: "07110", email: "franklintailor.sample@example.com" },
  { name: "Shore Point Plumbing & Heating", category: "Plumber", profile: "home", street: "17 W Pacific Ave", city: "Wildwood", zip: "08260", email: "" },
  { name: "Paws on Passaic Grooming", category: "Pet groomer", profile: "pet", street: "101 Passaic Ave", city: "Nutley", zip: "07110", email: "" },
];

export async function loadSamples() {
  const b = await run("INSERT INTO batches (source, summary) VALUES ('sample', 'Sample leads for trying the tool')");
  const batchId = Number(b.lastInsertRowid);
  for (const [i, s] of SAMPLES.entries()) {
    await insertBusiness({
      ...s,
      batch_id: batchId,
      is_sample: true,
      state: "NJ",
      address: `${s.street}, ${s.city}, NJ ${s.zip}, USA`,
      phone: `(609) 555-01${String(10 + i)}`,
      email: s.email || null,
      socials: i % 2 === 0 ? [`https://www.facebook.com/sample-${i}`] : [],
      hours: [
        "Monday: 9:00 AM – 6:00 PM",
        "Tuesday: 9:00 AM – 6:00 PM",
        "Wednesday: 9:00 AM – 6:00 PM",
        "Thursday: 9:00 AM – 7:00 PM",
        "Friday: 9:00 AM – 7:00 PM",
        "Saturday: 10:00 AM – 4:00 PM",
        "Sunday: Closed",
      ],
      rating: 4.2 + (i % 4) * 0.2,
      review_count: 18 + i * 23,
      reviews: [
        { author: "Sample Reviewer", rating: 5, text: "Great local spot, friendly people and fair prices. Highly recommend!", when: "2 weeks ago" },
        { author: "Another Customer", rating: 4, text: "Always reliable. Been coming here for years.", when: "a month ago" },
      ],
      photos: [],
      maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " " + s.city + " NJ")}`,
      search_query: `${s.category.toLowerCase()} in ${s.city}, NJ`,
    });
  }
  return SAMPLES.length;
}
