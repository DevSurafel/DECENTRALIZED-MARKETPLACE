import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Json } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  Image as ImageIcon,
  Link,
  Tag,
  FileText,
} from "lucide-react";

export interface PortfolioItem {
  id?: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  url?: string;
  imageUrl?: string;
}

interface PortfolioManagerProps {
  portfolioItems: PortfolioItem[];
  userId: string;
  isOwnProfile: boolean;
  onUpdate: () => void;
}

const PortfolioManager = ({
  portfolioItems,
  userId,
  isOwnProfile,
  onUpdate,
}: PortfolioManagerProps) => {
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    image: string;
    tags: string;
    url: string;
    imageUrl: string;
  }>({
    title: "",
    description: "",
    image: "",
    tags: "",
    url: "",
    imageUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image: "",
      tags: "",
      url: "",
      imageUrl: "",
    });
    setSelectedIndex(null);
  };

  const handleAdd = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const newItem: PortfolioItem = {
      id: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      image: formData.image || "🎨",
      tags,
      url: formData.url || undefined,
      imageUrl: formData.imageUrl || undefined,
    };

    const updatedItems = [...portfolioItems, newItem];

    const { error } = await supabase
      .from("profiles")
      .update({ portfolio_items: JSON.parse(JSON.stringify(updatedItems)) as Json })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add portfolio item",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Portfolio item added" });
      setAddDialog(false);
      resetForm();
      onUpdate();
    }
  };

  const handleEdit = async () => {
    if (selectedIndex === null) return;
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const updatedItem: PortfolioItem = {
      ...portfolioItems[selectedIndex],
      title: formData.title,
      description: formData.description,
      image: formData.image || "🎨",
      tags,
      url: formData.url || undefined,
      imageUrl: formData.imageUrl || undefined,
    };

    const updatedItems = [...portfolioItems];
    updatedItems[selectedIndex] = updatedItem;

    const { error } = await supabase
      .from("profiles")
      .update({ portfolio_items: JSON.parse(JSON.stringify(updatedItems)) as Json })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update portfolio item",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Portfolio item updated" });
      setEditDialog(false);
      resetForm();
      onUpdate();
    }
  };

  const handleDelete = async () => {
    if (selectedIndex === null) return;

    setSaving(true);
    const updatedItems = portfolioItems.filter((_, i) => i !== selectedIndex);

    const { error } = await supabase
      .from("profiles")
      .update({ portfolio_items: JSON.parse(JSON.stringify(updatedItems)) as Json })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete portfolio item",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Portfolio item deleted" });
      setDeleteDialog(false);
      resetForm();
      onUpdate();
    }
  };

  const openEditDialog = (index: number) => {
    const item = portfolioItems[index];
    setSelectedIndex(index);
    setFormData({
      title: item.title || "",
      description: item.description || "",
      image: item.image || "",
      tags: item.tags?.join(", ") || "",
      url: item.url || "",
      imageUrl: item.imageUrl || "",
    });
    setEditDialog(true);
  };

  const openDeleteDialog = (index: number) => {
    setSelectedIndex(index);
    setDeleteDialog(true);
  };

  const PortfolioForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Project Title *
        </Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., DeFi Yield Aggregator"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of your project"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="text-lg">{formData.image || "🎨"}</span>
            Emoji Icon
          </Label>
          <Input
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            placeholder="🎨"
            maxLength={4}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Image URL
          </Label>
          <Input
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags (comma-separated)
        </Label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="React, Web3, DeFi, Solidity"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Link className="w-4 h-4" />
          Project URL
        </Label>
        <Input
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://github.com/... or https://myproject.com"
        />
      </div>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={saving} className="w-full">
          {saving ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Portfolio</h2>
        {isOwnProfile && (
          <Dialog open={addDialog} onOpenChange={(open) => {
            setAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Portfolio Project</DialogTitle>
              </DialogHeader>
              <PortfolioForm onSubmit={handleAdd} submitLabel="Add Project" />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {portfolioItems && portfolioItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {portfolioItems.map((item, index) => (
            <Card
              key={item.id || index}
              className="overflow-hidden glass-card shadow-card hover:shadow-glow transition-smooth group relative"
            >
              {/* Image/Emoji Header */}
              <div className="h-32 md:h-44 relative overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-hero flex items-center justify-center text-4xl md:text-6xl">
                    {item.image || "🎨"}
                  </div>
                )}

                {/* Edit/Delete Overlay */}
                {isOwnProfile && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1"
                      onClick={() => openEditDialog(index)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => openDeleteDialog(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 md:p-5">
                <h3 className="text-base md:text-lg font-bold mb-2 line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description || "No description"}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.tags?.slice(0, 4).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags?.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.tags.length - 4}
                    </Badge>
                  )}
                </div>

                {/* View Button */}
                {item.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => window.open(item.url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Project
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 glass-card shadow-card text-center">
          <div className="text-4xl mb-4">📁</div>
          <p className="text-muted-foreground">
            {isOwnProfile
              ? "No portfolio items yet. Showcase your work by adding projects!"
              : "No portfolio items yet"}
          </p>
          {isOwnProfile && (
            <Button
              className="mt-4 gap-2"
              onClick={() => setAddDialog(true)}
            >
              <Plus className="w-4 h-4" />
              Add Your First Project
            </Button>
          )}
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={(open) => {
        setEditDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Portfolio Project</DialogTitle>
          </DialogHeader>
          <PortfolioForm onSubmit={handleEdit} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedIndex !== null && portfolioItems[selectedIndex]?.title}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PortfolioManager;
