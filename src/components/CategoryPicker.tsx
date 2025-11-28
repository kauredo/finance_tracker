"use client";

import { useState, useEffect, useRef } from "react";
import Icon, { IconName } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CategoryPickerProps {
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CategoryPicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Select category",
}: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      if (response.ok) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const selectedCategory = categories.find((c) => c.id === value);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        variant="secondary"
        className="w-full justify-between h-auto py-3 px-4"
      >
        {selectedCategory ? (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${selectedCategory.color}20`,
                color: selectedCategory.color,
              }}
            >
              <Icon name={selectedCategory.icon as IconName} size={20} />
            </div>
            <span>{selectedCategory.name}</span>
          </div>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <svg
          className={`w-5 h-5 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              autoFocus
              className="text-sm"
            />
          </div>

          {/* Category List */}
          <div className="overflow-y-auto max-h-64">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-muted text-sm">
                No categories found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredCategories.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelect(category.id)}
                    variant="ghost"
                    className={`w-full justify-start h-auto py-2 px-3 ${
                      value === category.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-3"
                      style={{
                        backgroundColor: `${category.color}20`,
                        color: category.color,
                      }}
                    >
                      <Icon name={category.icon as IconName} size={20} />
                    </div>
                    <span className="text-sm font-medium flex-1 text-left">{category.name}</span>
                    {value === category.id && (
                      <svg
                        className="w-5 h-5 ml-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
