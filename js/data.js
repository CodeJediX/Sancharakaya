    const regionPlans = {
      "Cultural Triangle": {
        baseCost: 52,
        days: [
          {
            title: "Sigiriya & Dambulla",
            morning: "Arrive early and climb Sigiriya Rock Fortress before the heat peaks.",
            afternoon: "Visit the Dambulla Cave Temple and view the statue and mural complexes.",
            evening: "Enjoy a local village dinner and short cultural walk.",
            travel: "Approximately 4 hours from Colombo by car or van.",
            cost: 55,
            safety: "Agree tuk-tuk fares before departure and use licensed guides at heritage sites.",
            sustainable: "Buy crafts from registered village workshops rather than unverified street sellers."
          },
          {
            title: "Polonnaruwa & Minneriya",
            morning: "Explore the ancient city of Polonnaruwa by bicycle or guided tour.",
            afternoon: "Take a safari in Minneriya or Kaudulla National Park, depending on season.",
            evening: "Relax by the lake and review the next day's route.",
            travel: "Local travel within the Cultural Triangle, typically 1-2 hours between sites.",
            cost: 65,
            safety: "Carry water, wear sun protection, and avoid unlicensed safari drivers.",
            sustainable: "Choose community-linked safari operators that support local employment."
          }
        ]
      },

      "Hill Country": {
        baseCost: 48,
        days: [
          {
            title: "Kandy & Cultural Highlands",
            morning: "Visit the Temple of the Sacred Tooth Relic and the city center.",
            afternoon: "Explore the Royal Botanic Gardens or a local craft workshop.",
            evening: "Attend a cultural dance show or enjoy a hilltop dinner.",
            travel: "Approximately 4-5 hours from the Cultural Triangle depending on route.",
            cost: 46,
            safety: "Use official ticket counters for performances and avoid unlicensed street guides.",
            sustainable: "Support local artisans and small family-run cafes."
          },
          {
            title: "Nuwara Eliya / Ella Scenic Corridor",
            morning: "Take a scenic train ride through tea country if timing permits.",
            afternoon: "Visit a tea factory, viewpoint, or waterfall stop.",
            evening: "Explore a small hill town and try local tea varieties.",
            travel: "Hill Country routes can be slow and scenic; build buffer time.",
            cost: 58,
            safety: "Watch weather changes and use trusted transport for late-night travel.",
            sustainable: "Prefer small estate tours and local guides over large resellers."
          }
        ]
      },

      "South Coast": {
        baseCost: 55,
        days: [
          {
            title: "Galle & Coastal Heritage",
            morning: "Walk the Galle Fort ramparts and explore museums and cafes.",
            afternoon: "Visit a nearby beach or artisan shop.",
            evening: "Seafood dinner near the coast.",
            travel: "Approximately 2 hours from Colombo via expressway.",
            cost: 54,
            safety: "Use registered taxis or ride-hailing where possible.",
            sustainable: "Choose locally owned restaurants and boutique stays."
          },
          {
            title: "Mirissa / Tangalle Beach Day",
            morning: "Beach time or ethical whale watching where seasonally appropriate.",
            afternoon: "Visit a fishing village or quiet coastal viewpoint.",
            evening: "Sunset beach walk and local dinner.",
            travel: "Coastal roads connect major south coast towns within 1-2 hours.",
            cost: 64,
            safety: "Check sea conditions and swim only in safe areas.",
            sustainable: "Prefer operators with responsible wildlife and waste practices."
          }
        ]
      },

      "East Coast": {
        baseCost: 53,
        days: [
          {
            title: "Trincomalee & Nilaveli",
            morning: "Visit Fort Frederick or Koneswaram Temple area.",
            afternoon: "Relax at Nilaveli Beach or take a boat trip where available.",
            evening: "Seafood dinner near the beach.",
            travel: "Approximately 5-6 hours from Colombo depending on route.",
            cost: 56,
            safety: "Confirm boat safety equipment and avoid informal unlicensed tours.",
            sustainable: "Support local guesthouses and community-run experiences."
          },
          {
            title: "Arugam Bay & Lagoon Communities",
            morning: "Surf lesson or beach time depending on season and skill level.",
            afternoon: "Lagoon tour or village food experience.",
            evening: "Sunset and casual coastal dinner.",
            travel: "Travel times in the east can vary; plan daylight transfers.",
            cost: 59,
            safety: "Use reputable surf instructors and avoid remote roads late at night.",
            sustainable: "Choose local instructors and community-based tour providers."
          }
        ]
      },

      "Colombo & West": {
        baseCost: 44,
        days: [
          {
            title: "Colombo City & Culture",
            morning: "Visit Gangaramaya Temple and nearby museums.",
            afternoon: "Explore Pettah markets, colonial architecture, or seaside promenades.",
            evening: "Dinner at a local restaurant and short city walk.",
            travel: "Ideal for arrival or departure days.",
            cost: 45,
            safety: "Use official taxis or ride apps, especially after dark.",
            sustainable: "Buy from established local craft shops and urban community enterprises."
          }
        ]
      },

      "Wildlife & National Parks": {
        baseCost: 68,
        days: [
          {
            title: "Yala / Udawalawe Safari Experience",
            morning: "Early morning safari with a licensed operator.",
            afternoon: "Visit an interpretation center, elephant transit home, or local village project.",
            evening: "Rest at eco-conscious accommodation.",
            travel: "Access depends on park and season; private transport is recommended.",
            cost: 78,
            safety: "Stay inside the vehicle unless in designated safe areas and follow ranger guidance.",
            sustainable: "Choose operators that respect park rules and support conservation fees."
          }
        ]
      }
    };

    const extraThemes = [
      {
        title: "Community & Hidden Gems Day",
        morning: "Visit a local market and observe everyday Sri Lankan life.",
        afternoon: "Meet a small community-based tourism operator or village project.",
        evening: "Try a home-style meal or cooking demonstration.",
        travel: "Mostly local transport within the selected region.",
        cost: 35,
        safety: "Ask your host or accommodation for trusted local transport options.",
        sustainable: "Direct spending here supports households rather than large intermediaries."
      },
      {
        title: "Nature & Slow Travel Day",
        morning: "Short hike, garden visit, or nature walk with a local guide.",
        afternoon: "Visit a lesser-known viewpoint, lake, or forest edge area.",
        evening: "Quiet dinner and early rest.",
        travel: "Short regional journeys with flexible timing.",
        cost: 38,
        safety: "Carry water, wear suitable footwear, and avoid isolated trails after dark.",
        sustainable: "Low-impact experiences reduce pressure on overcrowded attractions."
      },
      {
        title: "Food & Culture Day",
        morning: "Explore a bakery, spice shop, or fruit market.",
        afternoon: "Take a short cooking class or visit a family-run restaurant.",
        evening: "Food tasting walk or local dessert stop.",
        travel: "Walkable or short rides within town.",
        cost: 36,
        safety: "Choose busy, clean food venues and drink bottled or safe water.",
        sustainable: "Food-based tourism spreads income to small vendors and producers."
      },
      {
        title: "Flexible Discovery Day",
        morning: "Open time for photography, rest, or revisiting a favorite spot.",
        afternoon: "Add an optional local experience based on weather and energy levels.",
        evening: "Plan the next route segment with your host or assistant.",
        travel: "Minimal travel; buffer day for weather or fatigue.",
        cost: 32,
        safety: "Keep emergency contacts saved and share your daily plan with someone trusted.",
        sustainable: "Buffer days help prevent rushed travel and support more responsible pacing."
      }
    ];

    const priceData = [
      {
        category: "Transport",
        item: "Tuk-tuk short city ride (1-3 km)",
        fair: "LKR 100-300",
        fairMin: 100,
        fairMax: 300,
        tourist: "LKR 500-1,500",
        keywords: ["tuk", "tuk-tuk", "threewheel", "three-wheeler", "ride", "km"],
        notes: "Use meter or ride-hailing where available, and agree the fare first."
      },
      {
        category: "Transport",
        item: "Airport to Colombo private car",
        fair: "LKR 3,500-6,000",
        fairMin: 3500,
        fairMax: 6000,
        tourist: "LKR 8,000+",
        keywords: ["airport", "cmb", "colombo", "taxi", "car"],
        notes: "Pre-book or use the official airport taxi counter."
      },
      {
        category: "Tickets",
        item: "Kandy to Ella train (standard classes)",
        fair: "LKR 500-2,500 depending on class",
        fairMin: 500,
        fairMax: 2500,
        tourist: "LKR 5,000+ via unofficial agents",
        keywords: ["train", "kandy", "ella", "railway", "ticket"],
        notes: "Use official railway pricing and avoid scalpers."
      },
      {
        category: "Food",
        item: "Local meal (rice and curry)",
        fair: "LKR 700-1,500",
        fairMin: 700,
        fairMax: 1500,
        tourist: "LKR 2,500+",
        keywords: ["meal", "rice", "curry", "food", "restaurant", "lunch", "dinner"],
        notes: "Local eateries are usually cheaper than tourist-focused cafes."
      },
      {
        category: "Tickets",
        item: "Sigiriya entry fee (foreign visitor)",
        fair: "Check official current rate at ticket counter",
        fairMin: null,
        fairMax: null,
        tourist: "Unofficial extras or false shortcuts",
        keywords: ["sigiriya", "entry", "ticket", "entrance", "heritage"],
        notes: "Buy tickets only at official counters; guides are optional but should be licensed."
      },
      {
        category: "Tours",
        item: "Half-day local guide",
        fair: "LKR 5,000-10,000",
        fairMin: 5000,
        fairMax: 10000,
        tourist: "LKR 15,000+",
        keywords: ["guide", "half-day", "tour", "licensed"],
        notes: "Use licensed guides and agree scope before starting."
      },
      {
        category: "Tours",
        item: "Whale watching tour",
        fair: "LKR 15,000-25,000",
        fairMin: 15000,
        fairMax: 25000,
        tourist: "Very low-cost unsafe boats",
        keywords: ["whale", "watching", "boat", "mirissa", "tour"],
        notes: "Choose operators with safety standards and responsible wildlife practices."
      },
      {
        category: "Shopping",
        item: "Souvenir / handicraft",
        fair: "LKR 1,500-7,500 depending on craft",
        fairMin: 1500,
        fairMax: 7500,
        tourist: "Inflated antique claims",
        keywords: ["souvenir", "handicraft", "craft", "gem", "spice", "antique", "shop"],
        notes: "Avoid protected wildlife products and compare prices across shops."
      }
    ];

    const safetyData = [
      {
        region: "All Sri Lanka",
        level: "Common",
        category: "Transport",
        icon: "TUK",
        title: "Overcharging / unmetered transport",
        guidance: "Agree fares before travel, use ride-hailing apps in cities, and ask hotels for official taxi services.",
        watchFor: "No meter, unclear route, pressure to pay before the ride, or sudden extra charges.",
        action: "Ask for the final fare in LKR before getting in. If it feels high, compare with the Fair-Price Guide or use a ride app."
      },
      {
        region: "Cultural Triangle",
        level: "Moderate",
        category: "Guides",
        icon: "ID",
        title: "Unofficial guides around heritage sites",
        guidance: "Use licensed guides only and avoid offers of special shortcuts or false official access.",
        watchFor: "Claims like special entrance, private shortcut, ticket counter closed, or mandatory guide.",
        action: "Buy tickets at official counters and ask to see guide identification before accepting help."
      },
      {
        region: "Hill Country",
        level: "Weather",
        category: "Weather",
        icon: "RAIN",
        title: "Sudden rain and leeches on trails",
        guidance: "Carry rain protection, wear sturdy shoes, and use local guides for remote hikes.",
        watchFor: "Fast-changing fog, slippery railway tracks, isolated trails, and late-afternoon rain.",
        action: "Start hikes early, check weather before leaving, and avoid remote trails after dark."
      },
      {
        region: "South Coast",
        level: "Seasonal",
        category: "Beach",
        icon: "SEA",
        title: "Strong sea conditions and rip currents",
        guidance: "Swim in flagged safe zones, check local warnings, and avoid alcohol before swimming.",
        watchFor: "Red flags, rough surf, empty beaches with no lifeguard, or locals warning against swimming.",
        action: "Use lifeguarded beaches, ask your stay about current conditions, and do not swim after drinking."
      },
      {
        region: "East Coast",
        level: "Seasonal",
        category: "Transport",
        icon: "ROAD",
        title: "Surf conditions and remote roads at night",
        guidance: "Use trusted transport after dark and check surf conditions with reputable instructors.",
        watchFor: "Long night transfers, informal surf lessons, poor lighting, and isolated beach roads.",
        action: "Plan inter-town travel in daylight and choose surf instructors recommended by your accommodation."
      },
      {
        region: "Wildlife parks",
        level: "Safety",
        category: "Wildlife",
        icon: "PARK",
        title: "Wildlife proximity",
        guidance: "Stay inside vehicles unless in designated areas and always follow ranger instructions.",
        watchFor: "Drivers getting too close, feeding wildlife, standing in vehicles, or leaving marked routes.",
        action: "Choose responsible safari operators and tell the driver you prefer safe distance over close photos."
      },
      {
        region: "Markets & shops",
        level: "Common",
        category: "Shopping",
        icon: "SHOP",
        title: "Gem, spice, and souvenir pressure sales",
        guidance: "Compare prices, avoid rushed purchases, and be careful with claims about rare antiques or investment gems.",
        watchFor: "Limited-time deals, friend discount stories, forced shop stops, or no written receipt.",
        action: "Walk away if pressured. Buy from established stores and keep receipts for higher-value items."
      },
      {
        region: "All Sri Lanka",
        level: "Important",
        category: "Tickets",
        icon: "PASS",
        title: "Fake ticket help and closed-counter claims",
        guidance: "Use official counters, official websites, or trusted accommodation support for tickets and transport bookings.",
        watchFor: "Someone saying the office is closed, tickets are sold out, or only they can get access.",
        action: "Check the official counter yourself before paying a third party."
      }
    ];

    const sustainabilityData = [
      {
        name: "Village lunch experience",
        region: "Cultural Triangle",
        type: "Community-based tourism",
        impact: "Direct income for rural households"
      },
      {
        name: "Small-group tea estate walk",
        region: "Hill Country",
        type: "Eco / agricultural tourism",
        impact: "Supports estate workers and local guides"
      },
      {
        name: "Community fishing village tour",
        region: "East Coast",
        type: "Community-based tourism",
        impact: "Diversifies income beyond mass tour operators"
      },
      {
        name: "Ethical wildlife viewing",
        region: "Wildlife & National Parks",
        type: "Responsible wildlife tourism",
        impact: "Encourages park fees and conservation funding"
      },
      {
        name: "Local craft workshop visit",
        region: "Colombo & West",
        type: "Cultural preservation",
        impact: "Supports artisans and traditional skills"
      },
      {
        name: "Low-impact beach stays",
        region: "South Coast",
        type: "Sustainable accommodation",
        impact: "Reduces environmental pressure in high-demand coastal zones"
      }
    ];

    const personaData = [
      {
        name: "First-Time Independent Traveler",
        description: "Visiting Sri Lanka for the first time and overwhelmed by conflicting information.",
        needs: "A trustworthy starting point and a clear day-by-day plan.",
        features: "AI Itinerary Planner, Virtual Assistant, Predictive Recommendation Engine"
      },
      {
        name: "Budget Backpacker",
        description: "Highly price-sensitive and looking for value, local experiences, and off-the-beaten-path options.",
        needs: "Fair-price guidance, scam alerts, community-based suggestions.",
        features: "Fair-Price Guide, Safety Alerts, Sustainable Tourism Matching"
      },
      {
        name: "Digital Nomad / Slow Traveler",
        description: "Staying weeks to months and wants ongoing adaptive recommendations.",
        needs: "Flexible planning, local culture, food, and longer-stay suggestions.",
        features: "Assistant, Sustainable Matching, Personalized Recommendations"
      },
      {
        name: "Solo Traveler",
        description: "Places the highest value on safety, trust, and emergency information.",
        needs: "Safety alerts, verified guidance, and reliable transport advice.",
        features: "Safety & Scam Alerts, 24/7 Assistant, Fair-Price Guide"
      }
    ];

    const roadmapData = [
      {
        phase: "Phase 1",
        timeline: "Months 1–2",
        deliverables: "Core AI itinerary planner chat interface + curated Sri Lanka knowledge base covering major regions; internal testing"
      },
      {
        phase: "Phase 2",
        timeline: "Months 3–4",
        deliverables: "Multilingual virtual assistant, fair-price guide, region-based safety-alert layer; closed pilot with real travelers"
      },
      {
        phase: "Phase 3",
        timeline: "Months 5–6",
        deliverables: "Sustainable-tourism matching module, onboarding of first verified local partners, feedback-driven refinement"
      },
      {
        phase: "Phase 4",
        timeline: "Months 7–12",
        deliverables: "Public beta launch, booking/commission integration, B2B outreach, mobile app development"
      }
    ];

    const personaPresets = {
      "First-Time Independent Traveler": {
        budget: "mid",
        interests: ["culture", "nature", "beach", "food", "photography"]
      },
      "Budget Backpacker": {
        budget: "budget",
        interests: ["community", "food", "adventure", "culture"]
      },
      "Digital Nomad / Slow Traveler": {
        budget: "mid",
        interests: ["food", "wellness", "community", "photography"]
      },
      "Solo Traveler": {
        budget: "mid",
        interests: ["culture", "nature", "wellness", "food"]
      }
    };
