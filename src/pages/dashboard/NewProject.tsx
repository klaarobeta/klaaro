import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  Database,
  Upload,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

type Step = 'prompt' | 'data-source' | 'confirmation';
type DataSource = 'upload' | 'existing' | 'internet';

const NewProject = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<Step>('prompt');
  const [projectName, setProjectName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dataSource, setDataSource] = useState<DataSource>('upload');
  const [isCreating, setIsCreating] = useState(false);

  const steps = [
    { id: 'prompt', label: 'Describe Goal', icon: MessageSquare },
    { id: 'data-source', label: 'Data Source', icon: Database },
    { id: 'confirmation', label: 'Confirm', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    if (currentStep === 'prompt') {
      if (!projectName.trim()) {
        toast({ title: 'Project name required', variant: 'destructive' });
        return;
      }
      if (!prompt.trim()) {
        toast({ title: 'Please describe your goal', variant: 'destructive' });
        return;
      }
      setCurrentStep('data-source');
    } else if (currentStep === 'data-source') {
      setCurrentStep('confirmation');
    }
  };

  const handleBack = () => {
    if (currentStep === 'data-source') setCurrentStep('prompt');
    else if (currentStep === 'confirmation') setCurrentStep('data-source');
  };

  const handleCreateProject = async () => {
    setIsCreating(true);
    
    // Simulate project creation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Project Created!',
      description: 'Redirecting to dataset selection...',
    });
    
    // TODO: In Part 2, this will navigate to dataset selection/upload
    setTimeout(() => {
      navigate('/dashboard/datasets');
    }, 1000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">New AutoML Project</h1>
        </div>
        <p className="text-muted-foreground">
          Describe what you want to build and we'll handle the rest
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  index <= currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium hidden sm:block ${
                index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                index < currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="bg-card border-border">
        {/* Step 1: Prompt */}
        {currentStep === 'prompt' && (
          <>
            <CardHeader>
              <CardTitle>Describe Your Goal</CardTitle>
              <CardDescription>
                Tell us what you want to predict or classify. Be as specific as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Customer Churn Prediction"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prompt">What do you want to build?</Label>
                <Textarea
                  id="prompt"
                  placeholder="Example: I want to predict whether a customer will churn based on their usage patterns, subscription type, and support ticket history. The target variable is 'churned' which is 1 if the customer left and 0 if they stayed."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[150px] bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Mention the target variable, features you think are important, and the type of prediction.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Example prompts:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• "Predict house prices based on location, size, and amenities"</li>
                  <li>• "Classify emails as spam or not spam based on content"</li>
                  <li>• "Segment customers into groups based on purchase behavior"</li>
                  <li>• "Forecast next month's sales using historical data"</li>
                </ul>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: Data Source */}
        {currentStep === 'data-source' && (
          <>
            <CardHeader>
              <CardTitle>Choose Data Source</CardTitle>
              <CardDescription>
                Select where your training data will come from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={dataSource}
                onValueChange={(v) => setDataSource(v as DataSource)}
                className="space-y-4"
              >
                <label
                  htmlFor="upload"
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    dataSource === 'upload'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="upload" id="upload" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-primary" />
                      <span className="font-medium">Upload New Dataset</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload CSV, JSON, or Excel files from your computer
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="existing"
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    dataSource === 'existing'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="existing" id="existing" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium">Use Existing Dataset</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose from datasets you've already uploaded
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="internet"
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    dataSource === 'internet'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="internet" id="internet" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-500" />
                      <span className="font-medium">Find Dataset Online</span>
                      <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">AI-Powered</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Let AI find relevant public datasets for your project
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 'confirmation' && (
          <>
            <CardHeader>
              <CardTitle>Confirm Project Details</CardTitle>
              <CardDescription>
                Review your project configuration before creating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Project Name</p>
                  <p className="font-medium text-foreground">{projectName}</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Goal Description</p>
                  <p className="text-foreground">{prompt}</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Data Source</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {dataSource === 'upload' && <><Upload className="w-4 h-4" /> Upload New Dataset</>}
                    {dataSource === 'existing' && <><Database className="w-4 h-4" /> Use Existing Dataset</>}
                    {dataSource === 'internet' && <><Globe className="w-4 h-4" /> Find Dataset Online</>}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm text-foreground">
                  <strong>What happens next:</strong> After creating the project, you'll be guided through
                  dataset selection, automatic data analysis, and model training.
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 'prompt'}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {currentStep !== 'confirmation' ? (
          <Button onClick={handleNext} className="gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleCreateProject}
            disabled={isCreating}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isCreating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Create Project</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewProject;
