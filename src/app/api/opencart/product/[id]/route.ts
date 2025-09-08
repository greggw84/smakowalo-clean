import { type NextRequest, NextResponse } from 'next/server'
import { withCache, cacheKeys } from '@/lib/cache'

// Enhanced mock data with detailed cooking instructions and images
const getEnhancedMockData = (id: string) => ({
  product_id: id,
  name: "Wrap z kurczakiem i awokado",
  description: "Świeża tortilla z grillowanym kurczakiem, awokado, sałatą i sosem jogurtowym. Idealne danie na lunch lub kolację.",
  main_image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop",
  preparation_instructions: [
    {
      step: 1,
      title: "Przygotowanie składników",
      description: "Umyj wszystkie warzywa pod bieżącą wodą. Osusz sałatę w suszarce do sałat. Pokrój awokado na plastry, skrop sokiem z limonki aby nie ściemniało.",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
      time: "3 minuty",
      difficulty: "Łatwe",
      tips: ["Wybierz dojrzałe awokado - powinno być miękkie pod naciskiem", "Limonka zapobiega brunatnieniu awokado"]
    },
    {
      step: 2,
      title: "Przygotowanie kurczaka",
      description: "Rozgrzej patelnię z oliwą. Pokroj kurczaka w paski i dopraw solą, pieprzem i przyprawami. Smaż na średnim ogniu przez 8-10 minut aż będzie złoty.",
      image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop",
      time: "10 minut",
      difficulty: "Średnie",
      tips: ["Nie przesusz kurczaka - powinien pozostać soczysty", "Użyj termometru - temperatura wewnętrzna powinna wynosić 74°C"]
    },
    {
      step: 3,
      title: "Przygotowanie sosu",
      description: "W małej misce wymieszaj jogurt grecki z sokiem z limonki, posiekaną kolendrą, solą i pieprzem. Dopraw do smaku.",
      image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400&h=300&fit=crop",
      time: "2 minuty",
      difficulty: "Łatwe",
      tips: ["Sos można przygotować dzień wcześniej", "Dodaj szczyptę czosnku dla większej głębi smaku"]
    },
    {
      step: 4,
      title: "Składanie wrapy",
      description: "Podgrzej tortillę na suchej patelni przez 30 sekund z każdej strony. Połóż sałatę, kurczaka, awokado i sos w centrum. Zwiń ciasno od dołu.",
      image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop",
      time: "3 minuty",
      difficulty: "Średnie",
      tips: ["Nie przepełniaj wrapy - będzie trudno ją złożyć", "Zawiń najpierw dolną część, potem boki"]
    },
    {
      step: 5,
      title: "Podanie",
      description: "Przekrój wrapę na pół pod kątem. Podawaj natychmiast z dodatkowymi frytkami lub sałatką. Możesz podać z sosem na boku.",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
      time: "1 minuta",
      difficulty: "Łatwe",
      tips: ["Podawaj natychmiast aby tortilla nie zmiękła", "Udekoruj świeżą kolendrą"]
    }
  ],
  ingredients: [
    { name: "Tortilla pszenna", amount: "1 duża (około 25cm)", category: "Podstawa" },
    { name: "Pierś z kurczaka", amount: "150g", category: "Białko" },
    { name: "Awokado", amount: "1/2 sztuki", category: "Warzywa" },
    { name: "Sałata masłowa", amount: "3-4 liście", category: "Warzywa" },
    { name: "Pomidor", amount: "1 średni", category: "Warzywa" },
    { name: "Jogurt grecki", amount: "3 łyżki", category: "Sos" },
    { name: "Limonka", amount: "1/2 sztuki", category: "Przyprawy" },
    { name: "Kolendra świeża", amount: "2 łyżki", category: "Zioła" },
    { name: "Oliwa z oliwek", amount: "1 łyżka", category: "Tłuszcze" },
    { name: "Sól i pieprz", amount: "do smaku", category: "Przyprawy" }
  ],
  equipment_needed: [
    "Patelnia nieprzywierająca",
    "Nóż ostry",
    "Deska do krojenia",
    "Miska do mieszania",
    "Suszarka do sałat (opcjonalnie)",
    "Termometr kuchenny (opcjonalnie)"
  ],
  nutrition_info: {
    calories: 420,
    protein: "28g",
    carbs: "35g",
    fat: "18g",
    fiber: "8g",
    prep_time: "20 minut",
    cook_time: "10 minut",
    total_time: "30 minut",
    servings: 1,
    difficulty: "Średnie"
  },
  chef_notes: [
    "To danie można przygotować wcześniej - składniki trzymaj osobno i składaj tuż przed podaniem",
    "Spróbuj różnych wariantów: dodaj paprykę, kukurydzę lub czarną fasolę",
    "Dla wersji wegańskiej zastąp kurczaka tofu lub tempeh, a jogurt grecki wegańskim odpowiednikiem"
  ]
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use cache for OpenCart API calls
    const cacheKey = cacheKeys.product(id)

    const productData = await withCache(
      cacheKey,
      async () => {
        const opencartUrl = process.env.OPENCART_URL
        const apiToken = process.env.OPENCART_API_TOKEN
        const apiUsername = process.env.OPENCART_API_USERNAME

        if (!opencartUrl || opencartUrl.includes('demo.opencart.com')) {
          console.log('🔄 Using enhanced mock data for product:', id)
          return getEnhancedMockData(id)
        }

        // Try to fetch from real OpenCart API with authentication
        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'User-Agent': 'Smakowalo-App/1.0'
          }

          if (apiToken) {
            headers.Authorization = `Bearer ${apiToken}`
          }

          if (apiUsername) {
            headers['X-API-Username'] = apiUsername
          }

          console.log(`🔄 Fetching product ${id} from OpenCart: ${opencartUrl}`)

          const response = await fetch(`${opencartUrl}/products/${id}`, {
            headers,
            timeout: 10000 // 10 second timeout
          })

          if (response.ok) {
            const data = await response.json()
            console.log('✅ Successfully fetched product from OpenCart')

            // Transform OpenCart data to our enhanced format
            return {
              ...data,
              // Ensure we have enhanced instruction format
              preparation_instructions: data.preparation_instructions || getEnhancedMockData(id).preparation_instructions,
              // Add nutrition info if missing
              nutrition_info: data.nutrition_info || getEnhancedMockData(id).nutrition_info,
              // Add chef notes if missing
              chef_notes: data.chef_notes || getEnhancedMockData(id).chef_notes
            }
          }

          console.log(`⚠️ OpenCart API response not ok: ${response.status} - falling back to mock`)
          throw new Error(`OpenCart API returned ${response.status}`)

        } catch (error) {
          console.log('❌ OpenCart API error, using enhanced mock data:', error)
          return getEnhancedMockData(id)
        }
      },
      1800000 // Cache for 30 minutes
    )

    return NextResponse.json({
      success: true,
      data: productData,
      source: productData === getEnhancedMockData(id) ? 'enhanced-mock' : 'opencart-cached',
      cached: true
    })

  } catch (error) {
    console.error('❌ Error in OpenCart product API:', error)

    // Always fallback to enhanced mock data
    const mockData = getEnhancedMockData(await params.then(p => p.id))

    return NextResponse.json({
      success: true,
      data: mockData,
      source: 'fallback-mock',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
