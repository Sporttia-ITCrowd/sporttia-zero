interface InfoCardProps {
  icon: React.ReactNode;
  children: React.ReactNode;
}

function InfoCard({ icon, children }: InfoCardProps) {
  return (
    <div className="info-card flex gap-4">
      <div className="flex-shrink-0 text-primary">{icon}</div>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

export function InfoSidebar() {
  return (
    <div className="hidden lg:flex flex-col gap-4 w-full max-w-md">
      {/* Info Card */}
      <InfoCard icon={<InfoIcon className="w-6 h-6" />}>
        <p>
          This assistant allows you to create a basic sports center. Keep in mind that
          Sporttia has many more modules to manage members, card payments, activities,
          tournaments, etc.
        </p>
      </InfoCard>

      {/* Sales Contact Card */}
      <InfoCard icon={<PersonIcon className="w-6 h-6" />}>
        <p>
          If you prefer to contact a sales representative, you can write to us at{' '}
          <a
            href="mailto:sales@sporttia.com"
            className="text-primary hover:underline font-medium"
          >
            sales@sporttia.com
          </a>
          .
        </p>
      </InfoCard>

      {/* Feedback Card */}
      <InfoCard icon={<EmailIcon className="w-6 h-6" />}>
        <p>
          If you want to leave feedback about this assistant, please write to us at{' '}
          <a
            href="mailto:zero@sporttia.com"
            className="text-primary hover:underline font-medium"
          >
            zero@sporttia.com
          </a>
          .
        </p>
      </InfoCard>
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
    </svg>
  );
}
