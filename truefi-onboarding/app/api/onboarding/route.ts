import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json()

    // Here you would typically save to your database
    // For now, we'll just log the answers and return success
    console.log("Onboarding answers received:", answers)

    // Example database save (replace with your actual database logic):
    // await db.userProfiles.create({
    //   data: {
    //     userId: getCurrentUserId(),
    //     name: answers.name,
    //     age: parseInt(answers.age),
    //     income: answers.income,
    //     employmentStatus: answers.employment_status,
    //     familyStatus: answers.family_status,
    //     debtSituation: answers.debt_situation,
    //     emergencyFundMonths: answers.emergency_fund,
    //     shortTermGoals: answers.financial_goals_short,
    //     longTermGoals: answers.financial_goals_long,
    //     riskTolerance: answers.risk_tolerance,
    //     investmentExperience: answers.investment_experience,
    //     budgetingHabits: answers.budgeting_habits,
    //     financialStressLevel: answers.financial_stress,
    //     advisorExperience: answers.advisor_experience,
    //     motivation: answers.motivation,
    //     createdAt: new Date()
    //   }
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving onboarding data:", error)
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 })
  }
}
