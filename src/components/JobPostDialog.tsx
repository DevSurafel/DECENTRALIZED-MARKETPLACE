import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Briefcase, X, DollarSign, Clock, Plus, Sparkles } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";

interface JobPostDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const JobPostDialog = ({ trigger, onSuccess }: JobPostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const { createJob, loading } = useJobs();

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
    
    const result = await createJob({
      title,
      description,
      budget_usdc: parseFloat(budget),
      skills_required: skills,
      duration_weeks: duration ? parseInt(duration) : undefined
    });

    if (result) {
      setOpen(false);
      setTitle("");
      setDescription("");
      setBudget("");
      setDuration("");
      setSkills([]);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="relative overflow-hidden group bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-lg hover:shadow-primary/50 transition-all duration-300 text-sm h-9">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            <span className="font-semibold">Post a Job</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[96vw] sm:max-w-[550px] max-h-[92vh] overflow-hidden p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5 border border-primary/20 shadow-2xl">
        {/* Compact Header */}
        <DialogHeader className="px-4 py-3 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-primary to-secondary rounded-lg shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Post a New Job
              </DialogTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Find the perfect freelancer</p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-130px)] px-4 py-3">
          <div className="space-y-3">
            {/* Job Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold flex items-center gap-1.5">
                <Briefcase className="h-3 w-3 text-primary" />
                Job Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Build DeFi Dashboard"
                required
                className="h-9 text-sm bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all duration-200"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Project Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project requirements..."
                rows={4}
                required
                className="text-sm bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all duration-200 resize-none"
              />
            </div>

            {/* Budget and Duration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="budget" className="text-xs font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  Budget (USDC)
                </Label>
                <div className="relative">
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1000.00"
                    required
                    className="h-9 text-sm bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-lg transition-all duration-200 pl-7"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">$</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="duration" className="text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-blue-500" />
                  Duration (weeks)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="2"
                  className="h-9 text-sm bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all duration-200"
                />
              </div>
            </div>

            {/* Skills Section */}
            <div className="space-y-2">
              <Label htmlFor="skills" className="text-xs font-semibold">
                Required Skills
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="e.g., React, Web3"
                  className="h-9 text-sm flex-1 bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all duration-200"
                />
                <Button 
                  type="button" 
                  onClick={handleAddSkill} 
                  className="h-9 px-4 text-xs bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 rounded-lg"
                >
                  <Plus className="h-3 w-3 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
              
              {/* Skills Display */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                  {skills.map((skill) => (
                    <Badge 
                      key={skill} 
                      className="gap-1 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-primary/90 to-secondary/90 hover:from-primary hover:to-secondary text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded"
                    >
                      {skill}
                      <X
                        className="h-2.5 w-2.5 cursor-pointer hover:text-red-200 transition-colors"
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 border-t border-primary/10 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)} 
            className="h-9 px-4 text-xs border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-lg transition-all duration-200"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            disabled={loading} 
            onClick={handleSubmit}
            className="h-9 px-6 text-xs bg-gradient-to-r from-primary via-secondary to-primary hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-300 relative overflow-hidden group"
          >
            {loading ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span>Post Job</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
