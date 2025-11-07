"use client"

interface CategoryFilterProps {
  categories: Array<{ value: string; label: string }>
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export function CategoryFilter({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {categories.map((category) => (
        <button
          key={category.value}
          onClick={() => onCategoryChange(category.value)}
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
            activeCategory === category.value
              ? "bg-primary text-white shadow-md"
              : "bg-secondary-light text-foreground hover:bg-secondary"
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}
