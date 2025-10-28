import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/hooks/useJobs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, DollarSign, Clock, Plus, X, Edit3, Sparkles } from "lucide-react";

interface EditJobDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditJobDialog({ job, open, onOpenChange, onSuccess }: EditJobDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job) {
      setTitle(job.title || "");
      setDescription(job.description || "");
      setBudget(job.budget_usdc?.toString() || "");
      setDuration(job.duration_weeks?.toString() || "");
      setSkills(job.skills_required || []);
    }
  }, [job]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          title,
          description,
          budget_usdc: parseFloat(budget),
          duration_weeks: duration ? parseInt(duration) : null,
          skills_required: skills,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job updated successfully"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[95vh] overflow-hidden p-0 gap-0 bg-gradient-to-br from-background via-background to-secondary/5 border border-secondary/20 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-6 pb-4 bg-gradient-to-r from-secondary/10 via-primary/10 to-secondary/10 border-b border-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-secondary to-primary rounded-xl shadow-lg">
              <Edit3 className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary via-primary to-secondary bg-clip-text text-transparent">
              Edit Job Posting
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Update your job details to attract the right talent</p>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-180px)] px-6 py-6">
          <div className="space-y-6">
            {/* Job Title */}
            <div className="space-y-2.5">
              <Label htmlFor="edit-title" className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-secondary" />
                Job Title
              </Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Build DeFi Dashboard"
                required
                className="h-12 text-base bg-background/60 backdrop-blur-sm border-2 border-secondary/20 focus:border-secondary focus:ring-2 focus:ring-secondary/20 rounded-xl transition-all duration-200"
              />
            </div>

            {/* Description */}
            <div className="space-y-2.5">
              <Label htmlFor="edit-description" className="text-sm font-semibold">
                Project Description
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project requirements..."
                rows={6}
                required
                className="text-base bg-background/60 backdrop-blur-sm border-2 border-secondary/20 focus:border-secondary focus:ring-2 focus:ring-secondary/20 rounded-xl transition-all duration-200 resize-none"
              />
              <p className="text-xs text-muted-foreground">Provide detailed requirements to help freelancers understand your needs</p>
            </div>

            {/* Budget and Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label htmlFor="edit-budget" className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Budget (USDC)
                </Label>
                <div className="relative">
                  <Input
                    id="edit-budget"
                    type="number"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1000.00"
                    required
                    className="h-12 text-base bg-background/60 backdrop-blur-sm border-2 border-secondary/20 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all duration-200 pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="edit-duration" className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Duration (weeks)
                </Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="2"
                  className="h-12 text-base bg-background/60 backdrop-blur-sm border-2 border-secondary/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-200"
                />
              </div>
            </div>

            {/* Skills Section */}
            <div className="space-y-3">
              <Label htmlFor="edit-skills" className="text-sm font-semibold">
                Required Skills
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="edit-skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="e.g., React, Web3, Solidity"
                  className="h-11 text-base flex-1 bg-background/60 backdrop-blur-sm border-2 border-secondary/20 focus:border-secondary focus:ring-2 focus:ring-secondary/20 rounded-xl transition-all duration-200"
                />
                <Button 
                  type="button" 
                  onClick={handleAddSkill}
                  className="h-11 px-6 bg-gradient-to-r from-secondary to-primary hover:shadow-lg hover:shadow-secondary/30 transition-all duration-300 rounded-xl"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>

              {/* Skills Display */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-secondary/5 rounded-xl border border-secondary/10">
                  {skills.map((skill) => (
                    <Badge 
                      key={skill}
                      className="gap-1.5 px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-secondary/90 to-primary/90 hover:from-secondary hover:to-primary text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                    >
                      {skill}
                      <X
                        className="h-3.5 w-3.5 cursor-pointer hover:text-red-200 transition-colors"
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {skills.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-1">Add skills to help freelancers understand your requirements</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 border-t border-secondary/10 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 rounded-xl transition-all duration-200"
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 px-8 bg-gradient-to-r from-secondary via-primary to-secondary hover:shadow-lg hover:shadow-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group"
          >
            {loading ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span>Update Job</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
