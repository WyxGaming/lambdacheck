import { AuthForm, AuthPageFrame } from "@/components/auth-forms";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function InscriptionPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <AuthPageFrame>
        <AuthForm mode="signup" />
      </AuthPageFrame>
      <SiteFooter />
    </div>
  );
}
