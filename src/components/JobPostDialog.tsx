import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, X, DollarSign, Clock, Plus, Sparkles, MapPin, Users, Eye, HelpCircle, FolderOpen, Zap } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";

interface JobPostDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: "web_dev", label: "Web Development" },
  { value: "mobile_dev", label: "Mobile Development" },
  { value: "design", label: "Design & Creative" },
  { value: "writing", label: "Writing & Content" },
  { value: "marketing", label: "Marketing" },
  { value: "data", label: "Data Science & Analytics" },
  { value: "ai_ml", label: "AI & Machine Learning" },
  { value: "blockchain", label: "Blockchain & Web3" },
  { value: "video", label: "Video & Animation" },
  { value: "admin", label: "Admin & Support" },
  { value: "other", label: "Other" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level", description: "Looking for new talent" },
  { value: "intermediate", label: "Intermediate", description: "Some experience required" },
  { value: "expert", label: "Expert", description: "Highly skilled professionals" },
];

const PROJECT_TYPES = [
  { value: "one_time", label: "One-time Project" },
  { value: "ongoing", label: "Ongoing Work" },
  { value: "contract", label: "Contract / Full-time" },
];

const PAYMENT_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly Rate" },
];

const LOCATION_TYPES = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

const TIMEZONES = [
  { value: "any", label: "Any Timezone" },
  { value: "americas", label: "Americas (UTC-8 to UTC-3)" },
  { value: "europe", label: "Europe (UTC-1 to UTC+3)" },
  { value: "asia", label: "Asia (UTC+5 to UTC+9)" },
  { value: "pacific", label: "Pacific (UTC+10 to UTC+12)" },
];

export const JobPostDialog = ({ trigger, onSuccess }: JobPostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [projectType, setProjectType] = useState("one_time");
  const [paymentType, setPaymentType] = useState("fixed");
  const [locationType, setLocationType] = useState("remote");
  const [timezonePreference, setTimezonePreference] = useState("any");
  const [freelancersNeeded, setFreelancersNeeded] = useState("1");
  const [visibility, setVisibility] = useState("public");
  const [questionInput, setQuestionInput] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setBudget("");
    setDuration("");
    setSkills([]);
    setCategory("");
    setExperienceLevel("intermediate");
    setProjectType("one_time");
    setPaymentType("fixed");
    setLocationType("remote");
    setTimezonePreference("any");
    setFreelancersNeeded("1");
    setVisibility("public");
    setQuestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createJob({
      title,
      description,
      budget_usdc: parseFloat(budget),
      skills_required: skills,
      duration_weeks: duration ? parseInt(duration) : undefined,
      category: category || undefined,
      experience_level: experienceLevel,
      project_type: projectType,
      payment_type: paymentType,
      location_type: locationType,
      timezone_preference: timezonePreference === "any" ? undefined : timezonePreference,
      freelancers_needed: parseInt(freelancersNeeded) || 1,
      visibility,
      questions_for_freelancer: questions.length > 0 ? questions : undefined,
    });

    if (result) {
      setOpen(false);
      resetForm();
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
      <DialogContent className="max-w-[96vw] sm:max-w-[650px] max-h-[92vh] overflow-hidden p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5 border border-primary/20 shadow-2xl">
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
              <p className="text-[10px] sm:text-xs text-muted-foreground">Find the perfect freelancer for your project</p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-130px)] px-4 py-3">
          <div className="space-y-4">
            {/* Section: Basic Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" />
                Basic Information
              </h3>
              
              {/* Job Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">
                  Job Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Build DeFi Dashboard with React & Web3"
                  required
                  className="h-9 text-sm bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all duration-200"
                />
              </div>

              {/* Category & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <FolderOpen className="h-3 w-3 text-primary" />
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 text-sm bg-background/60 border-2 border-primary/20 focus:border-primary rounded-lg">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    Experience Level
                  </Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger className="h-9 text-sm bg-background/60 border-2 border-primary/20 focus:border-primary rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <span>{level.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Project Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project in detail. Include goals, deliverables, and any specific requirements..."
                  rows={4}
                  required
                  className="text-sm bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all duration-200 resize-none"
                />
              </div>
            </div>

            {/* Section: Budget & Timeline */}
            <div className="space-y-3 pt-2 border-t border-primary/10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" />
                Budget & Timeline
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Type</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger className="h-9 text-sm bg-background/60 border-2 border-primary/20 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="budget" className="text-xs font-semibold">
                    {paymentType === "hourly" ? "Hourly Rate" : "Budget"} (USDC) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder={paymentType === "hourly" ? "50.00" : "1000.00"}
                      required
                      className="h-9 text-sm bg-background/60 border-2 border-primary/20 rounded-lg pl-7"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">$</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger className="h-9 text-sm bg-background/60 border-2 border-primary/20 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    Duration
                  </Label>
                  <div className="relative">
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="2"
                      className="h-9 text-sm bg-background/60 border-2 border-primary/20 rounded-lg pr-14"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">weeks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Location & Availability */}
            <div className="space-y-3 pt-2 border-t border-primary/10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                Location & Availability
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Work Location</Label>
                  <Select value={locationType} onValueChange={setLocationType}>
                    <SelectTrigger className="h-9 text-sm bg-background/60 border-2 border-primary/20 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {LOCATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Timezone Preference</Label>
                  <Select value={timezonePreference} onValueChange={setTimezonePreference}>
                    <SelectTrigger className="h-9 text-sm bg-background/60 border-2 border-primary/20 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="freelancers" className="text-xs font-semibold flex items-center gap-1">
                    <Users className="h-3 w-3 text-purple-500" />
                    Freelancers Needed
                  </Label>
                  <Input
                    id="freelancers"
                    type="number"
                    min="1"
                    max="10"
                    value={freelancersNeeded}
                    onChange={(e) => setFreelancersNeeded(e.target.value)}
                    className="h-9 text-sm bg-background/60 border-2 border-primary/20 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Section: Skills */}
            <div className="space-y-3 pt-2 border-t border-primary/10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Required Skills
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="e.g., React, Solidity, Figma"
                  className="h-9 text-sm flex-1 bg-background/60 border-2 border-primary/20 rounded-lg"
                />
                <Button 
                  type="button" 
                  onClick={handleAddSkill} 
                  className="h-9 px-4 text-xs bg-gradient-to-r from-primary to-secondary hover:shadow-lg rounded-lg"
                >
                  <Plus className="h-3 w-3 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
              
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                  {skills.map((skill) => (
                    <Badge 
                      key={skill} 
                      className="gap-1 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-primary/90 to-secondary/90 text-white border-0 shadow-sm rounded"
                    >
                      {skill}
                      <X
                        className="h-2.5 w-2.5 cursor-pointer hover:text-red-200"
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Screening Questions */}
            <div className="space-y-3 pt-2 border-t border-primary/10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="h-3 w-3" />
                Screening Questions (Optional)
              </h3>
              <p className="text-xs text-muted-foreground">Ask freelancers questions they must answer when applying</p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddQuestion())}
                  placeholder="e.g., What similar projects have you completed?"
                  className="h-9 text-sm flex-1 bg-background/60 border-2 border-primary/20 rounded-lg"
                />
                <Button 
                  type="button" 
                  onClick={handleAddQuestion} 
                  className="h-9 px-4 text-xs bg-gradient-to-r from-primary to-secondary hover:shadow-lg rounded-lg"
                >
                  <Plus className="h-3 w-3 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
              
              {questions.length > 0 && (
                <div className="space-y-1.5 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-semibold text-xs">{i + 1}.</span>
                      <span className="flex-1 text-xs">{q}</span>
                      <X
                        className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveQuestion(q)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Visibility */}
            <div className="space-y-3 pt-2 border-t border-primary/10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                Job Visibility
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "public", label: "Public", desc: "Visible to all" },
                  { value: "private", label: "Private", desc: "By invite only" },
                  { value: "invite_only", label: "Invite Only", desc: "Selected freelancers" },
                ].map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVisibility(v.value)}
                    className={`p-2.5 rounded-lg border-2 transition-all duration-200 text-left ${
                      visibility === v.value
                        ? "border-primary bg-primary/10"
                        : "border-primary/20 bg-background/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="text-xs font-semibold">{v.label}</div>
                    <div className="text-[10px] text-muted-foreground">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 border-t border-primary/10 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)} 
            className="h-9 px-4 text-xs border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-lg"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            disabled={loading || !title || !description || !budget || !category} 
            onClick={handleSubmit}
            className="h-9 px-6 text-xs bg-gradient-to-r from-primary via-secondary to-primary hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 rounded-lg font-semibold transition-all duration-300 relative overflow-hidden group"
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