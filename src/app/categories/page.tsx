"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import { Card } from "@/components/ui/Card";
import Icon, { IconName } from "@/components/icons/Icon";
import CategoryModal from "@/components/CategoryModal";
import DeleteCategoryModal from "@/components/DeleteCategoryModal";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_custom: boolean;
  owner_id: string | null;
}

export default function CategoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch categories");
      }

      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      showError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    if (!category.is_custom) {
      showError("Cannot edit default categories");
      return;
    }
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDeleteClick = async (category: Category) => {
    // First try to delete directly to check for transactions
    // Or we can just open the modal and let it handle the check?
    // Actually, the modal needs the transaction count.
    // Let's fetch the count first or try to delete and catch the error.

    // Better UX: Open modal, let modal fetch count?
    // Or fetch count here.

    setDeletingCategory(category);
    setIsDeleting(true);

    try {
      // Check for transactions first
      // We can use the delete endpoint which returns 400 with count
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess("Category deleted successfully");
        fetchCategories();
        setDeletingCategory(null);
      } else if (
        response.status === 400 &&
        data.transactionCount !== undefined
      ) {
        // Has transactions, show modal with count
        setTransactionCount(data.transactionCount);
        // Keep deletingCategory set, so modal opens (we need to change how we render modal)
      } else {
        throw new Error(data.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error checking category:", error);
      showError(
        error instanceof Error ? error.message : "Failed to delete category",
      );
      setDeletingCategory(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  const defaultCategories = categories.filter((c) => !c.is_custom);
  const customCategories = categories.filter((c) => c.is_custom);

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Categories
              </h1>
              <p className="text-muted">
                Manage transaction categories and create custom ones
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              New Category
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted">
              Loading categories...
            </div>
          ) : (
            <div className="space-y-8">
              {/* Custom Categories */}
              {customCategories.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    My Categories
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {customCategories.map((category) => (
                      <Card
                        key={category.id}
                        variant="glass"
                        className="group hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="flex flex-col items-center gap-3 p-4">
                          <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                            }}
                          >
                            <Icon name={category.icon as IconName} size={32} />
                          </div>
                          <h3 className="font-semibold text-foreground text-center">
                            {category.name}
                          </h3>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="px-3 py-1 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(category)}
                              className="px-3 py-1 text-sm bg-danger/10 text-danger rounded hover:bg-danger/20 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Categories */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Default Categories
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {defaultCategories.map((category) => (
                    <Card
                      key={category.id}
                      variant="glass"
                      className="group hover:shadow-lg transition-all"
                    >
                      <div className="flex flex-col items-center gap-3 p-4">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: `${category.color}20`,
                            color: category.color,
                          }}
                        >
                          <Icon name={category.icon as IconName} size={32} />
                        </div>
                        <h3 className="font-semibold text-foreground text-center">
                          {category.name}
                        </h3>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {customCategories.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted mb-4">
                    You haven't created any custom categories yet
                  </p>
                  <button
                    onClick={handleCreate}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all"
                  >
                    Create Your First Category
                  </button>
                </div>
              )}
            </div>
          )}

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
                fetchCategories();
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
                showSuccess("Category deleted successfully");
                fetchCategories();
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
