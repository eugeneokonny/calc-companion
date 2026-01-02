import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Shield } from 'lucide-react';

export const PolicyAcceptanceModal = () => {
  const { needsPolicyAcceptance, acceptPolicies } = useAuth();
  const { toast } = useToast();
  
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!acceptTerms || !acceptPrivacy) {
      toast({
        variant: 'destructive',
        title: 'Required',
        description: 'You must accept both policies to continue.'
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await acceptPolicies();
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } else {
      toast({
        title: 'Policies Accepted',
        description: 'Thank you for accepting our policies.'
      });
    }
  };

  if (!needsPolicyAcceptance) return null;

  return (
    <Dialog open={needsPolicyAcceptance} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Accept Terms & Privacy Policy
          </DialogTitle>
          <DialogDescription>
            Please review and accept our terms to continue using the application.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 pr-4">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Terms of Service
              </h4>
              <p className="text-sm text-muted-foreground">
                By using the Structural Design Assistant, you agree to use the service responsibly 
                and in accordance with applicable laws. All calculations provided are for reference 
                purposes and should be verified by a qualified structural engineer. We are not 
                liable for any damages arising from the use of calculations provided by this service.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                Privacy Policy
              </h4>
              <p className="text-sm text-muted-foreground">
                We collect and process your personal data (email, username, login activity) to 
                provide our services. Your data is securely stored and never sold to third parties. 
                You have the right to access, correct, or delete your personal data at any time 
                through your account settings.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="space-y-3 pt-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I accept the Terms of Service
            </label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="privacy"
              checked={acceptPrivacy}
              onCheckedChange={(checked) => setAcceptPrivacy(checked as boolean)}
            />
            <label
              htmlFor="privacy"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I accept the Privacy Policy
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!acceptTerms || !acceptPrivacy || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept & Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
