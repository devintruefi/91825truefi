import { Card, CardContent } from "@/components/ui/card"

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "TrueFi takes the stress out of managing my money. It's like having a financial advisor in my pocket, anytime I need it.",
      author: "Sarah M.",
    },
    {
      quote:
        "I didn't grow up learning about money. TrueFi helps me track my spending, build savings, and actually understand what's going on with my finances, all without judgment.",
      author: "Marcus T.",
    },
    {
      quote:
        "Penny makes financial planning feel approachable and achievable. I've saved more in the past 6 months than I did in the previous 2 years.",
      author: "Jessica L.",
    },
  ]

  return (
    <section className="py-16 sm:py-20 lg:py-32 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            What Our Users Say
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join other users who have transformed their financial lives with TrueFi.ai
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            >
              <CardContent className="p-6 sm:p-8">
                <blockquote className="text-base sm:text-lg italic mb-4 leading-relaxed text-gray-900 dark:text-white">
                  "{testimonial.quote}"
                </blockquote>
                <cite className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-300">
                  — {testimonial.author}
                </cite>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
