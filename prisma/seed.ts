import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const categories = [
  ["textbooks", "課本與筆記", "Textbooks & Notes", "BookOpen"],
  ["electronics", "電子產品", "Electronics", "Laptop"],
  ["dorm", "宿舍與家具", "Dorm & Furniture", "Armchair"],
  ["clothing", "服飾", "Clothing", "Shirt"],
  ["sports", "運動與戶外", "Sports & Outdoors", "Dumbbell"],
  ["bikes", "自行車與機車", "Bikes & Scooters", "Bike"],
  ["kitchen", "廚房用品", "Kitchen", "CookingPot"],
  ["stationery", "文具", "Stationery", "Pencil"],
  ["tickets", "票券與活動", "Tickets & Events", "Ticket"],
  ["other", "其他", "Other", "Package"],
];
const landmarks = [
  ["main-entrance", "校門入口", "Main Entrance"],
  ["cafeteria", "餐廳入口", "Cafeteria Entrance"],
  ["library", "圖書館入口", "Library Entrance"],
  ["activity-center", "學生活動中心入口", "Student Activity Center Entrance"],
  ["dorm-entrance", "宿舍公共入口", "Public Dormitory Entrance"],
  ["parking", "停車場入口", "Parking Area Entrance"],
];
async function main() {
  for (const [slug, nameZh, nameEn, icon] of categories)
    await db.category.upsert({
      where: { slug },
      create: { slug, nameZh, nameEn, icon },
      update: { nameZh, nameEn, icon },
    });
  for (const campus of ["JIEREN", "JIANGUO", "CENTRAL"]) {
    for (const [slug, nameZh, nameEn] of landmarks) {
      const id = campus.toLowerCase() + "-" + slug;
      await db.exchangePoint.upsert({
        where: { id },
        create: { id, campus, nameZh, nameEn, verified: false },
        update: {},
      });
    }
  }
  const email = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
  if (email)
    await db.user.upsert({
      where: { email },
      create: { email, role: "ADMIN", displayName: "Campus Admin" },
      update: { role: "ADMIN" },
    });
  if (process.env.SEED_DEMO === "true") {
    const seller = await db.user.upsert({
      where: { email: "marketplace.demo@gms.tcu.edu.tw" },
      create: {
        email: "marketplace.demo@gms.tcu.edu.tw",
        name: "Demo Student",
        displayName: "示範同學",
        department: "資訊工程學系",
        rulesAcceptedAt: new Date(),
      },
      update: {},
    });
    const items = [
      ["微積分課本", "textbooks", 250],
      ["普通生物學課本", "textbooks", 300],
      ["解剖學圖譜", "textbooks", 600],
      ["USB-C 集線器", "electronics", 350],
      ["藍牙耳機", "electronics", 1200],
      ["宿舍檯燈", "dorm", 200],
      ["折疊收納架", "dorm", 150],
      ["保暖外套", "clothing", 400],
      ["運動背包", "sports", 300],
      ["羽球拍", "sports", 500],
      ["校園通勤腳踏車", "bikes", 1800],
      ["不鏽鋼保溫杯", "kitchen", 100],
      ["筆記本與資料夾", "stationery", 0],
      ["二手小說三本", "other", 0],
      ["小型白板", "stationery", 120],
    ] as const;
    for (const [index, [title, slug, price]] of items.entries()) {
      const category = await db.category.findUniqueOrThrow({ where: { slug } });
      const id = `demo-listing-${index + 1}`;
      await db.listing.upsert({
        where: { id },
        create: {
          id,
          sellerId: seller.id,
          title,
          description:
            "示範刊登：保存良好，適合校園生活使用。可在白天於校園公開交換點見面，請先聯絡確認物品狀況。",
          categoryId: category.id,
          condition: "GOOD",
          priceNtd: price || null,
          isFree: price === 0,
          meetupLocation: "jieren-library",
          campuses: ["JIEREN", "CENTRAL"],
          images: {
            create: {
              url: `/demo/${index + 1}.webp`,
              thumbUrl: `/demo/${index + 1}.webp`,
              alt: title,
              position: 0,
            },
          },
        },
        update: {},
      });
    }
  }
}
main().finally(() => db.$disconnect());
