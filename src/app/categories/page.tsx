"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import Icon, { IconName } from "@/components/icons/Icon";
import CategoryModal from "@/components/CategoryModal";
import DeleteCategoryModal from "@/components/DeleteCategoryModal";
import Image from "next/image";
import { motion } from "motion/react";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
}

export default function CategoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [transactionCount, setTransactionCount] = useState<number | null>(null);

  // Fetch categories from Convex
  const categoriesData = useQuery(api.categories.list);
  const getTransactionCount = useMutation(api.categories.getTransactionCount);
  const deleteCategory = useMutation(api.categories.remove);

  const loading = categoriesData === undefined;

  const categories = useMemo(() => {
    return (categoriesData ?? []).map((c) => ({
      id: c._id,
      name: c.name,
      color: c.color || "#6b7280",
      icon: c.icon || "other",
      isCustom: c.isCustom,
    }));
  }, [categoriesData]);

  const handleCreate = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    if (!category.isCustom) {
      showError("Cannot edit default categories");
      return;
    }
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDeleteClick = async (category: Category) => {
    setDeletingCategory(category);

    try {
      const count = await getTransactionCount({
        id: category.id as Id<"categories">,
      });

      if (count === 0) {
        // No transactions, delete immediately
        await deleteCategory({ id: category.id as Id<"categories"> });
        showSuccess("Category removed from garden");
        setDeletingCategory(null);
      } else {
        // Show modal to reassign transactions
        setTransactionCount(count);
      }
    } catch (error) {
      console.error("Error checking category:", error);
      showError(
        error instanceof Error ? error.message : "Failed to delete category",
      );
      setDeletingCategory(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Image src="/logo.png" alt="Loading" width={48} height={48} />
        </motion.div>
      </div>
    );
  }

  const defaultCategories = categories.filter((c) => !c.isCustom);
  const customCategories = categories.filter((c) => c.isCustom);

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-sand via-cream to-primary-pale">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">🏷️</span>
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    Categories
                  </h1>
                </div>
                <p className="text-text-secondary">
                  Organize your spending with custom labels
                </p>
              </div>
              <Button onClick={handleCreate} variant="bloom" pill>
                <Icon name="plus" size={18} />
                New Category
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="flex flex-col items-center gap-3 p-4">
                    <div className="w-16 h-16 bg-sand rounded-xl" />
                    <div className="h-5 w-20 bg-sand rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              {/* Custom Categories */}
              {customCategories.length > 0 && (
                <section>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-6"
                  >
                    <span className="text-2xl">✨</span>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      My Categories
                    </h2>
                    <Badge variant="default" pill className="ml-2">
                      {customCategories.length} custom
                    </Badge>
                  </motion.div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {customCategories.map((category, index) => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="group hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden">
                          {/* Edit/Delete buttons on hover */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(category);
                              }}
                              className="p-1.5 rounded-lg bg-surface hover:bg-primary-pale text-text-secondary hover:text-primary transition-colors"
                            >
                              <Icon name="edit" size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(category);
                              }}
                              className="p-1.5 rounded-lg bg-surface hover:bg-expense/10 text-text-secondary hover:text-expense transition-colors"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>

                          <div className="flex flex-col items-center gap-3 p-5">
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                              style={{
                                backgroundColor: `${category.color}15`,
                                color: category.color,
                              }}
                            >
                              <Icon
                                name={category.icon as IconName}
                                size={28}
                              />
                            </div>
                            <h3 className="font-display font-bold text-foreground text-center">
                              {category.name}
                            </h3>
                            <Badge variant="default" size="sm" pill>
                              Custom
                            </Badge>
                          </div>
                        </Card>
                      </motion.div>
                    ))}

                    {/* Add New Category Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: customCategories.length * 0.05 }}
                    >
                      <div
                        onClick={handleCreate}
                        className="group border-2 border-dashed border-border hover:border-primary/40 rounded-3xl p-5 h-full min-h-[160px] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover:bg-primary-pale/20"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-sand/50 group-hover:bg-primary-pale flex items-center justify-center transition-colors">
                          <Icon
                            name="plus"
                            size={24}
                            className="text-text-secondary group-hover:text-primary transition-colors"
                          />
                        </div>
                        <p className="text-sm text-text-secondary group-hover:text-primary font-medium transition-colors">
                          Add category
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </section>
              )}

              {/* Empty state for custom categories */}
              {customCategories.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <EmptyState
                    illustration="chart"
                    title="Create your first category"
                    description="Custom categories help you organize spending your way."
                    action={{
                      label: "Create Category",
                      onClick: handleCreate,
                      variant: "bloom",
                    }}
                  />
                </motion.div>
              )}

              {/* Default Categories */}
              <section>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-6"
                >
                  <span className="text-2xl">📦</span>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Default Categories
                  </h2>
                  <Badge variant="default" pill className="ml-2">
                    {defaultCategories.length} built-in
                  </Badge>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {defaultCategories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.03 }}
                    >
                      <Card className="group hover:shadow-md transition-all">
                        <div className="flex flex-col items-center gap-3 p-5">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{
                              backgroundColor: `${category.color}15`,
                              color: category.color,
                            }}
                          >
                            <Icon name={category.icon as IconName} size={28} />
                          </div>
                          <h3 className="font-display font-bold text-foreground text-center">
                            {category.name}
                          </h3>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Floating Add Button (Mobile) */}
        <motion.div
          className="fixed bottom-6 right-6 md:hidden"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <Button
            onClick={handleCreate}
            variant="bloom"
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg p-0"
          >
            <Icon name="plus" size={24} />
          </Button>
        </motion.div>
      </div>

      {/* Modals */}
      {showModal && (
        <CategoryModal
          category={editingCategory || undefined}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingCategory(null);
            // Convex auto-refreshes data
          }}
        />
      )}

      {deletingCategory && transactionCount !== null && (
        <DeleteCategoryModal
          category={deletingCategory}
          transactionCount={transactionCount}
          onClose={() => {
            setDeletingCategory(null);
            setTransactionCount(null);
          }}
          onSuccess={() => {
            setDeletingCategory(null);
            setTransactionCount(null);
            showSuccess("Category removed from garden");
            // Convex auto-refreshes data
          }}
        />
      )}
    </>
  );
}
