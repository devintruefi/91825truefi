"use client"

import { useState, useEffect } from "react"

export type TimeOfDay = "dawn" | "morning" | "afternoon" | "evening" | "night"
export type Season = "spring" | "summer" | "autumn" | "winter"

export interface NaturalTheme {
  timeOfDay: TimeOfDay
  season: Season
  colors: {
    primary: string[]
    secondary: string[]
    accent: string[]
    background: string[]
  }
  animations: {
    duration: string
    easing: string
    intensity: number
  }
  particles: {
    count: number
    speed: number
    colors: string[]
  }
}

const getTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 7) return "dawn"
  if (hour >= 7 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 20) return "evening"
  return "night"
}

const getSeason = (): Season => {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return "spring"
  if (month >= 5 && month <= 7) return "summer"
  if (month >= 8 && month <= 10) return "autumn"
  return "winter"
}

const createTheme = (timeOfDay: TimeOfDay, season: Season): NaturalTheme => {
  const themes: Record<TimeOfDay, Record<Season, Partial<NaturalTheme>>> = {
    dawn: {
      spring: {
        colors: {
          primary: ["255, 182, 193", "255, 218, 185", "255, 240, 245"], // Soft pinks and peaches
          secondary: ["144, 238, 144", "152, 251, 152", "240, 255, 240"], // Fresh greens
          accent: ["255, 215, 0", "255, 228, 181", "255, 250, 205"], // Golden yellows
          background: ["255, 248, 220", "255, 245, 238", "250, 240, 230"], // Warm creams
        },
        animations: { duration: "3.5s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.3 },
        particles: { count: 12, speed: 0.08, colors: ["255, 182, 193", "144, 238, 144", "255, 215, 0"] },
      },
      summer: {
        colors: {
          primary: ["255, 160, 122", "255, 218, 185", "255, 228, 196"], // Warm corals
          secondary: ["34, 197, 94", "74, 222, 128", "134, 239, 172"], // Vibrant greens
          accent: ["255, 140, 0", "255, 165, 0", "255, 215, 0"], // Bright oranges
          background: ["255, 239, 213", "255, 228, 196", "245, 222, 179"], // Golden morning
        },
        animations: { duration: "3.2s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.4 },
        particles: { count: 15, speed: 0.1, colors: ["255, 160, 122", "34, 197, 94", "255, 140, 0"] },
      },
      autumn: {
        colors: {
          primary: ["255, 140, 0", "255, 165, 0", "255, 215, 0"], // Warm oranges
          secondary: ["139, 69, 19", "160, 82, 45", "210, 180, 140"], // Rich browns
          accent: ["220, 20, 60", "255, 69, 0", "255, 99, 71"], // Deep reds
          background: ["255, 228, 196", "255, 218, 185", "245, 222, 179"], // Autumn warmth
        },
        animations: { duration: "4s", easing: "cubic-bezier(0.23, 0.1, 0.32, 1)", intensity: 0.25 },
        particles: { count: 10, speed: 0.06, colors: ["255, 140, 0", "139, 69, 19", "220, 20, 60"] },
      },
      winter: {
        colors: {
          primary: ["176, 196, 222", "230, 230, 250", "248, 248, 255"], // Soft blues
          secondary: ["119, 136, 153", "176, 196, 222", "211, 211, 211"], // Cool grays
          accent: ["255, 182, 193", "255, 218, 185", "255, 240, 245"], // Gentle pinks
          background: ["248, 248, 255", "245, 245, 245", "240, 248, 255"], // Crisp whites
        },
        animations: { duration: "4.5s", easing: "cubic-bezier(0.165, 0.1, 0.44, 1)", intensity: 0.2 },
        particles: { count: 8, speed: 0.05, colors: ["176, 196, 222", "119, 136, 153", "255, 182, 193"] },
      },
    },
    morning: {
      spring: {
        colors: {
          primary: ["50, 205, 50", "144, 238, 144", "152, 251, 152"], // Fresh greens
          secondary: ["255, 218, 185", "255, 228, 196", "255, 239, 213"], // Warm creams
          accent: ["255, 215, 0", "255, 255, 0", "173, 255, 47"], // Bright yellows
          background: ["240, 255, 240", "245, 255, 250", "250, 255, 240"], // Light greens
        },
        animations: { duration: "2.8s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.4 },
        particles: { count: 18, speed: 0.12, colors: ["50, 205, 50", "255, 215, 0", "255, 218, 185"] },
      },
      summer: {
        colors: {
          primary: ["0, 191, 255", "135, 206, 250", "173, 216, 230"], // Sky blues
          secondary: ["34, 197, 94", "50, 205, 50", "124, 252, 0"], // Vibrant greens
          accent: ["255, 215, 0", "255, 255, 0", "255, 140, 0"], // Sunny yellows
          background: ["240, 248, 255", "230, 230, 250", "245, 245, 220"], // Clear skies
        },
        animations: { duration: "2.5s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.5 },
        particles: { count: 20, speed: 0.15, colors: ["0, 191, 255", "34, 197, 94", "255, 215, 0"] },
      },
      autumn: {
        colors: {
          primary: ["255, 140, 0", "255, 165, 0", "255, 215, 0"], // Golden oranges
          secondary: ["139, 69, 19", "160, 82, 45", "205, 133, 63"], // Rich browns
          accent: ["220, 20, 60", "255, 69, 0", "255, 99, 71"], // Warm reds
          background: ["255, 228, 196", "255, 218, 185", "245, 222, 179"], // Autumn glow
        },
        animations: { duration: "3.2s", easing: "cubic-bezier(0.23, 0.1, 0.32, 1)", intensity: 0.35 },
        particles: { count: 15, speed: 0.1, colors: ["255, 140, 0", "139, 69, 19", "220, 20, 60"] },
      },
      winter: {
        colors: {
          primary: ["70, 130, 180", "100, 149, 237", "135, 206, 250"], // Winter blues
          secondary: ["119, 136, 153", "176, 196, 222", "211, 211, 211"], // Cool grays
          accent: ["255, 255, 255", "248, 248, 255", "230, 230, 250"], // Pure whites
          background: ["248, 248, 255", "245, 245, 245", "240, 248, 255"], // Crisp morning
        },
        animations: { duration: "3.8s", easing: "cubic-bezier(0.165, 0.1, 0.44, 1)", intensity: 0.3 },
        particles: { count: 12, speed: 0.08, colors: ["70, 130, 180", "119, 136, 153", "255, 255, 255"] },
      },
    },
    afternoon: {
      spring: {
        colors: {
          primary: ["34, 197, 94", "22, 163, 74", "21, 128, 61"], // Deep greens
          secondary: ["16, 185, 129", "20, 184, 166", "6, 182, 212"], // Teal blues
          accent: ["245, 158, 11", "251, 191, 36", "253, 224, 71"], // Warm golds
          background: ["240, 253, 250", "220, 252, 231", "187, 247, 208"], // Fresh greens
        },
        animations: { duration: "2.5s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.4 },
        particles: { count: 20, speed: 0.12, colors: ["34, 197, 94", "16, 185, 129", "245, 158, 11"] },
      },
      summer: {
        colors: {
          primary: ["59, 130, 246", "37, 99, 235", "29, 78, 216"], // Bright blues
          secondary: ["34, 197, 94", "22, 163, 74", "21, 128, 61"], // Rich greens
          accent: ["251, 191, 36", "245, 158, 11", "217, 119, 6"], // Golden yellows
          background: ["219, 234, 254", "191, 219, 254", "147, 197, 253"], // Sunny skies
        },
        animations: { duration: "2.2s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.5 },
        particles: { count: 22, speed: 0.15, colors: ["59, 130, 246", "34, 197, 94", "251, 191, 36"] },
      },
      autumn: {
        colors: {
          primary: ["234, 88, 12", "194, 65, 12", "154, 52, 18"], // Deep oranges
          secondary: ["120, 53, 15", "92, 38, 5", "69, 26, 3"], // Rich browns
          accent: ["239, 68, 68", "220, 38, 38", "185, 28, 28"], // Warm reds
          background: ["254, 243, 199", "253, 230, 138", "252, 211, 77"], // Golden afternoon
        },
        animations: { duration: "2.8s", easing: "cubic-bezier(0.23, 0.1, 0.32, 1)", intensity: 0.4 },
        particles: { count: 18, speed: 0.1, colors: ["234, 88, 12", "120, 53, 15", "239, 68, 68"] },
      },
      winter: {
        colors: {
          primary: ["30, 64, 175", "29, 78, 216", "37, 99, 235"], // Deep blues
          secondary: ["71, 85, 105", "100, 116, 139", "148, 163, 184"], // Cool grays
          accent: ["219, 234, 254", "191, 219, 254", "147, 197, 253"], // Light blues
          background: ["241, 245, 249", "248, 250, 252", "255, 255, 255"], // Bright winter
        },
        animations: { duration: "3.2s", easing: "cubic-bezier(0.165, 0.1, 0.44, 1)", intensity: 0.35 },
        particles: { count: 15, speed: 0.08, colors: ["30, 64, 175", "71, 85, 105", "219, 234, 254"] },
      },
    },
    evening: {
      spring: {
        colors: {
          primary: ["168, 85, 247", "147, 51, 234", "126, 34, 206"], // Soft purples
          secondary: ["236, 72, 153", "219, 39, 119", "190, 24, 93"], // Pink hues
          accent: ["251, 191, 36", "245, 158, 11", "217, 119, 6"], // Golden accents
          background: ["253, 244, 255", "250, 232, 255", "243, 232, 255"], // Lavender evening
        },
        animations: { duration: "3.5s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.3 },
        particles: { count: 15, speed: 0.08, colors: ["168, 85, 247", "236, 72, 153", "251, 191, 36"] },
      },
      summer: {
        colors: {
          primary: ["251, 113, 133", "244, 63, 94", "225, 29, 72"], // Warm pinks
          secondary: ["251, 146, 60", "249, 115, 22", "234, 88, 12"], // Sunset oranges
          accent: ["250, 204, 21", "245, 158, 11", "217, 119, 6"], // Golden hour
          background: ["255, 241, 242", "254, 226, 226", "253, 164, 175"], // Warm sunset
        },
        animations: { duration: "3.2s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.4 },
        particles: { count: 18, speed: 0.1, colors: ["251, 113, 133", "251, 146, 60", "250, 204, 21"] },
      },
      autumn: {
        colors: {
          primary: ["239, 68, 68", "220, 38, 38", "185, 28, 28"], // Deep reds
          secondary: ["234, 88, 12", "194, 65, 12", "154, 52, 18"], // Rich oranges
          accent: ["245, 158, 11", "217, 119, 6", "180, 83, 9"], // Amber glow
          background: ["254, 242, 242", "254, 226, 226", "252, 165, 165"], // Autumn evening
        },
        animations: { duration: "4s", easing: "cubic-bezier(0.23, 0.1, 0.32, 1)", intensity: 0.3 },
        particles: { count: 12, speed: 0.07, colors: ["239, 68, 68", "234, 88, 12", "245, 158, 11"] },
      },
      winter: {
        colors: {
          primary: ["99, 102, 241", "79, 70, 229", "67, 56, 202"], // Evening purples
          secondary: ["139, 92, 246", "124, 58, 237", "109, 40, 217"], // Violet hues
          accent: ["196, 181, 253", "167, 139, 250", "139, 92, 246"], // Light purples
          background: ["245, 243, 255", "237, 233, 254", "224, 231, 255"], // Winter twilight
        },
        animations: { duration: "4.5s", easing: "cubic-bezier(0.165, 0.1, 0.44, 1)", intensity: 0.25 },
        particles: { count: 10, speed: 0.06, colors: ["99, 102, 241", "139, 92, 246", "196, 181, 253"] },
      },
    },
    night: {
      spring: {
        colors: {
          primary: ["59, 130, 246", "37, 99, 235", "29, 78, 216"], // Night blues
          secondary: ["139, 92, 246", "124, 58, 237", "109, 40, 217"], // Deep purples
          accent: ["34, 197, 94", "22, 163, 74", "21, 128, 61"], // Moonlit greens
          background: ["15, 23, 42", "30, 41, 59", "51, 65, 85"], // Deep night
        },
        animations: { duration: "5s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.2 },
        particles: { count: 8, speed: 0.04, colors: ["59, 130, 246", "139, 92, 246", "34, 197, 94"] },
      },
      summer: {
        colors: {
          primary: ["30, 58, 138", "30, 64, 175", "37, 99, 235"], // Deep night blues
          secondary: ["88, 28, 135", "107, 33, 168", "126, 34, 206"], // Rich purples
          accent: ["16, 185, 129", "20, 184, 166", "6, 182, 212"], // Cool teals
          background: ["7, 89, 133", "12, 74, 110", "15, 23, 42"], // Summer night
        },
        animations: { duration: "4.5s", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", intensity: 0.25 },
        particles: { count: 10, speed: 0.05, colors: ["30, 58, 138", "88, 28, 135", "16, 185, 129"] },
      },
      autumn: {
        colors: {
          primary: ["120, 53, 15", "92, 38, 5", "69, 26, 3"], // Deep browns
          secondary: ["185, 28, 28", "153, 27, 27", "127, 29, 29"], // Dark reds
          accent: ["217, 119, 6", "180, 83, 9", "146, 64, 14"], // Ember glow
          background: ["41, 37, 36", "28, 25, 23", "15, 23, 42"], // Autumn night
        },
        animations: { duration: "5.5s", easing: "cubic-bezier(0.23, 0.1, 0.32, 1)", intensity: 0.18 },
        particles: { count: 6, speed: 0.03, colors: ["120, 53, 15", "185, 28, 28", "217, 119, 6"] },
      },
      winter: {
        colors: {
          primary: ["30, 64, 175", "29, 78, 216", "37, 99, 235"], // Icy blues
          secondary: ["71, 85, 105", "51, 65, 85", "30, 41, 59"], // Cold grays
          accent: ["219, 234, 254", "191, 219, 254", "147, 197, 253"], // Starlight
          background: ["15, 23, 42", "30, 41, 59", "51, 65, 85"], // Winter night
        },
        animations: { duration: "6s", easing: "cubic-bezier(0.165, 0.1, 0.44, 1)", intensity: 0.15 },
        particles: { count: 5, speed: 0.025, colors: ["30, 64, 175", "71, 85, 105", "219, 234, 254"] },
      },
    },
  }

  const baseTheme = themes[timeOfDay][season]
  return {
    timeOfDay,
    season,
    colors: baseTheme.colors!,
    animations: baseTheme.animations!,
    particles: baseTheme.particles!,
  }
}

export function useNaturalTheme() {
  const [theme, setTheme] = useState<NaturalTheme>(() => createTheme(getTimeOfDay(), getSeason()))

  useEffect(() => {
    const updateTheme = () => {
      setTheme(createTheme(getTimeOfDay(), getSeason()))
    }

    // Update theme every minute to catch time changes
    const interval = setInterval(updateTheme, 60000)

    // Update immediately if time has changed significantly
    const timeoutId = setTimeout(updateTheme, 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeoutId)
    }
  }, [])

  return theme
}
