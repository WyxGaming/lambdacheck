import { AuthPageFrame } from "@/components/auth-forms";
import { EmailConfirmation } from "@/components/email-confirmation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function ConfirmationPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <AuthPageFrame>
        <EmailConfirmation />
      </AuthPageFrame>
      <SiteFooter />
    </div>
  );
}
