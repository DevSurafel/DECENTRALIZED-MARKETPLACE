import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Briefcase, X } from "lucide-react";
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
          <Button className="shadow-glow">
            <Briefcase className="h-4 w-4 mr-2" />
            Post a Job
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-primary/5 border-2 border-primary/30 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Post a New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold text-foreground">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Build DeFi Dashboard"
              required
              className="h-12 bg-background/50 border-primary/20 focus:border-primary/40 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project requirements..."
              rows={5}
              required
              className="bg-background/50 border-primary/20 focus:border-primary/40 shadow-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget" className="text-sm font-semibold text-foreground">Budget (USDC)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="1000"
                required
                className="h-12 bg-background/50 border-primary/20 focus:border-primary/40 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-semibold text-foreground">Duration (weeks)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="2"
                className="h-12 bg-background/50 border-primary/20 focus:border-primary/40 shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills" className="text-sm font-semibold text-foreground">Required Skills</Label>
            <div className="flex gap-2">
              <Input
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add a skill and press Enter"
                className="h-12 bg-background/50 border-primary/20 focus:border-primary/40 shadow-sm"
              />
              <Button type="button" onClick={handleAddSkill} variant="outline" className="h-12 px-6 border-primary/20 hover:border-primary/40">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 px-3 py-1.5 text-sm hover:bg-primary/20 transition-colors">
                  {skill}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                    onClick={() => handleRemoveSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-primary/10">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-12 px-6 border-primary/20 hover:border-primary/40">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-12 px-8 shadow-glow">
              {loading ? "Posting..." : "Post Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
