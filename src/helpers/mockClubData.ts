
// This file contains mock data for clubs since we don't have a real backend yet
// In a production app, this would come from an API or database

// Mock club data
export const mockClubs = [
  {
    id: "club-1",
    name: "Täby OK",
    description: "Täby Orienteringsklubb is a Swedish orienteering club based in Täby, north of Stockholm.",
    memberCount: 2,
    location: "Täby, Sweden",
    logo: "/placeholder.svg",
    contactEmail: "info@tabyok.se",
    website: "https://www.tabyok.se",
    foundedYear: 1929,
    achievements: ["Swedish Relay Champions 2018", "10-Mila Winners 2019"]
  },
  {
    id: "club-2",
    name: "OK Linné",
    description: "OK Linné is an orienteering club based in Uppsala, Sweden.",
    memberCount: 150,
    location: "Uppsala, Sweden",
    logo: "/placeholder.svg",
    contactEmail: "info@oklinne.se",
    website: "https://www.oklinne.nu",
    foundedYear: 1946,
    achievements: ["Swedish Champions 2020", "25-manna Winners 2019"]
  },
  {
    id: "club-3",
    name: "IFK Göteborg",
    description: "IFK Göteborg is a sports club with orienteering section based in Gothenburg, Sweden.",
    memberCount: 200,
    location: "Gothenburg, Sweden",
    logo: "/placeholder.svg",
    contactEmail: "info@ifkgoteborg.se",
    website: "https://www.ifkgoteborg.se",
    foundedYear: 1904,
    achievements: ["Göteborg Champions 2021", "Regional Winners 2020"]
  }
];

// Mock club members
export const mockClubMembers = {
  "club-1": [
    {
      id: "user-1",
      name: "Elias Ljungdell",
      role: "admin",
      joinDate: "2020-01-15",
      achievements: ["Club Champion 2021", "10-Mila 2022"],
      profileImage: "/placeholder.svg"
    },
    {
      id: "user-2",
      name: "Hugo S",
      role: "admin",
      joinDate: "2021-03-10",
      achievements: ["Regional Champion 2022"],
      profileImage: "/placeholder.svg"
    }
  ],
  "club-2": [
    {
      id: "user-3",
      name: "Anna Andersson",
      role: "admin",
      joinDate: "2019-06-20",
      achievements: ["National Champion 2020", "European Cup 2021"],
      profileImage: "/placeholder.svg"
    },
    {
      id: "user-4",
      name: "Erik Johansson",
      role: "member",
      joinDate: "2020-08-12",
      achievements: ["Club Relay Champion 2021"],
      profileImage: "/placeholder.svg"
    }
  ],
  "club-3": [
    {
      id: "user-5",
      name: "Maria Nilsson",
      role: "admin",
      joinDate: "2018-04-05",
      achievements: ["Regional Champion 2019", "National Team 2020-2022"],
      profileImage: "/placeholder.svg"
    },
    {
      id: "user-6",
      name: "Johan Bergström",
      role: "member",
      joinDate: "2019-11-17",
      achievements: ["Junior Champion 2021"],
      profileImage: "/placeholder.svg"
    }
  ]
};
