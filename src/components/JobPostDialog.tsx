import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Briefcase, 
  X, 
  DollarSign, 
  Clock, 
  Plus, 
  MapPin, 
  Globe, 
  Users, 
  Zap,
  FolderOpen,
  Eye,
  EyeOff,
  UserCheck,
  HelpCircle
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";

interface JobPostDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const CATEGORIES = [
  "Smart Contract Development",
  "Frontend Development", 
  "Backend Development",
  "Full Stack Development",
  "UI/UX Design",
  "Blockchain Integration",
  "DeFi Development",
  "NFT Development",
  "Security Audit",
  "Other"
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" }
];

const PAYMENT_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly Rate" },
  { value: "milestone", label: "Milestone Based" }
];

const PROJECT_TYPES = [
  { value: "one_time", label: "One-time Project" },
  { value: "ongoing", label: "Ongoing Project" },
  { value: "contract", label: "Contract Work" }
];

const LOCATION_TYPES = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" }
];

const TIMEZONES = [
  "Any Timezone",
  "UTC-12 to UTC-8 (Americas)",
  "UTC-7 to UTC-4 (Americas)", 
  "UTC-3 to UTC+0 (Atlantic/Europe)",
  "UTC+1 to UTC+4 (Europe/Middle East)",
  "UTC+5 to UTC+8 (Asia)",
  "UTC+9 to UTC+12 (Asia Pacific)"
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "Visible to all", icon: Eye },
  { value: "private", label: "Private", description: "By invite only", icon: EyeOff },
  { value: "invite_only", label: "Invite Only", description: "Selected freelancers", icon: UserCheck }
];

export const JobPostDialog = ({ trigger, onSuccess }: JobPostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [budget, setBudget] = useState("");
  const [paymentType, setPaymentType] = useState("fixed");
  const [projectType, setProjectType] = useState("one_time");
  const [duration, setDuration] = useState("");
  const [locationType, setLocationType] = useState("remote");
  const [timezone, setTimezone] = useState("Any Timezone");
  const [freelancersNeeded, setFreelancersNeeded] = useState("1");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [visibility, setVisibility] = useState("public");
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

  const handleAddQuestion = () => {
    if (questionInput.trim() && !questions.includes(questionInput.trim())) {
      setQuestions([...questions, questionInput.trim()]);
      setQuestionInput("");
    }
  };

  const handleRemoveQuestion = (question: string) => {
    setQuestions(questions.filter(q => q !== question));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createJob({
      title,
      description,
      budget_usdc: parseFloat(budget),
      skills_required: skills,
      duration_weeks: duration ? parseInt(duration) : undefined,
      category,
      experience_level: experienceLevel,
      payment_type: paymentType,
      project_type: projectType,
      location_type: locationType,
      timezone_preference: timezone === "Any Timezone" ? null : timezone,
      freelancers_needed: parseInt(freelancersNeeded) || 1,
      questions_for_freelancer: questions,
      visibility
    });

    if (result) {
      setOpen(false);
      resetForm();
      onSuccess?.();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setExperienceLevel("intermediate");
    setBudget("");
    setPaymentType("fixed");
    setProjectType("one_time");
    setDuration("");
    setLocationType("remote");
    setTimezone("Any Timezone");
    setFreelancersNeeded("1");
    setSkills([]);
    setQuestions([]);
    setVisibility("public");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-5 transition-all duration-200 hover:shadow-lg">
            <Briefcase className="h-4 w-4 mr-2" />
            Post a Job
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[96vw] sm:max-w-[700px] max-h-[92vh] overflow-hidden p-0 gap-0 bg-card border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Post a New Job
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Find the perfect freelancer for your project</p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-160px)] px-6 py-5">
          <div className="space-y-6">
            {/* Section: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <FolderOpen className="h-4 w-4" />
                Basic Information
              </div>
              
              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1">
                  Job Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Build DeFi Dashboard with React & Web3"
                  required
                  className="h-11 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Category and Experience Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 text-primary" />
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 bg-background border-border">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-warning" />
                    Experience Level
                  </Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger className="h-11 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1">
                  Project Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project in detail. Include goals, deliverables, and any specific requirements..."
                  rows={4}
                  required
                  className="bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                />
              </div>
            </div>

            {/* Section: Budget & Timeline */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <DollarSign className="h-4 w-4" />
                Budget & Timeline
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Type</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger className="h-11 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-sm font-medium flex items-center gap-1">
                    Budget (USDC) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="1000.00"
                      required
                      className="h-11 pl-7 bg-background border-border focus:border-success focus:ring-1 focus:ring-success/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger className="h-11 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-info" />
                    Duration
                  </Label>
                  <div className="relative">
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="2"
                      className="h-11 pr-14 bg-background border-border focus:border-info focus:ring-1 focus:ring-info/20 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">weeks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Location & Availability */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <MapPin className="h-4 w-4" />
                Location & Availability
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Work Location</Label>
                  <Select value={locationType} onValueChange={setLocationType}>
                    <SelectTrigger className="h-11 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-secondary" />
                    Timezone Preference
                  </Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-11 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freelancers" className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-accent" />
                    Freelancers Needed
                  </Label>
                  <Input
                    id="freelancers"
                    type="number"
                    min="1"
                    value={freelancersNeeded}
                    onChange={(e) => setFreelancersNeeded(e.target.value)}
                    placeholder="1"
                    className="h-11 bg-background border-border transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Required Skills */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Required Skills
              </Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="e.g., React, Solidity, Figma"
                  className="h-11 flex-1 bg-background border-border"
                />
                <Button 
                  type="button" 
                  onClick={handleAddSkill}
                  className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                  {skills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary"
                      className="gap-1 px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary border-0 hover:bg-primary/20 transition-colors"
                    >
                      {skill}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors ml-1"
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Screening Questions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Screening Questions (Optional)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">Ask freelancers questions they must answer when applying</p>
              <div className="flex gap-2">
                <Input
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddQuestion())}
                  placeholder="e.g., What similar projects have you completed?"
                  className="h-11 flex-1 bg-background border-border"
                />
                <Button 
                  type="button" 
                  onClick={handleAddQuestion}
                  className="h-11 px-5 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {questions.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                  {questions.map((question, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 bg-background rounded-md">
                      <span className="text-sm text-foreground">{index + 1}. {question}</span>
                      <X
                        className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        onClick={() => handleRemoveQuestion(question)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Job Visibility */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Job Visibility
                </Label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)} 
            className="h-11 px-6 border-border hover:bg-muted transition-all"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            disabled={loading || !title || !description || !budget || !category} 
            onClick={handleSubmit}
            className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:opacity-50 transition-all"
          >
            {loading ? "Posting..." : "Post Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
