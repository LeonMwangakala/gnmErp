import { createFileRoute } from '@tanstack/react-router'
import { PublicContentLayout } from '@/features/auth/public-content-layout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function TermsOfService() {
  return (
    <PublicContentLayout>
      <Card>
        <CardHeader>
          <CardTitle className='text-2xl'>Terms of Service</CardTitle>
          <p className='text-sm text-muted-foreground'>
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </CardHeader>
        <CardContent className='space-y-6'>
          <section>
            <h2 className='mb-3 text-lg font-semibold'>1. Acceptance of Terms</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              By accessing and using this ERP System, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do 
              not use this service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>2. Use License</h2>
            <p className='mb-3 text-sm leading-relaxed text-muted-foreground'>
              Permission is granted to temporarily access the materials on ERP System's website for 
              personal, non-commercial transitory viewing only. This is the grant of a license, not a 
              transfer of title, and under this license you may not:
            </p>
            <ul className='ml-6 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground'>
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on the website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>3. User Account</h2>
            <p className='mb-3 text-sm leading-relaxed text-muted-foreground'>
              When you create an account with us, you must provide information that is accurate, 
              complete, and current at all times. You are responsible for safeguarding the password 
              and for all activities that occur under your account.
            </p>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              You may not use as a username the name of another person or entity or that is not 
              lawfully available for use, a name or trademark that is subject to any rights of 
              another person or entity, or a name that is otherwise offensive, vulgar, or obscene.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>4. Prohibited Uses</h2>
            <p className='mb-3 text-sm leading-relaxed text-muted-foreground'>
              You may not use our service:
            </p>
            <ul className='ml-6 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground'>
              <li>In any way that violates any applicable national or international law or regulation</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
              <li>To impersonate or attempt to impersonate the company, a company employee, another user, or any other person or entity</li>
              <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>5. Intellectual Property</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              The service and its original content, features, and functionality are and will remain 
              the exclusive property of ERP System and its licensors. The service is protected by 
              copyright, trademark, and other laws. Our trademarks and trade dress may not be used 
              in connection with any product or service without our prior written consent.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>6. Termination</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              We may terminate or suspend your account and bar access to the service immediately, 
              without prior notice or liability, under our sole discretion, for any reason whatsoever 
              and without limitation, including but not limited to a breach of the Terms.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>7. Disclaimer</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              The information on this website is provided on an "as is" basis. To the fullest extent 
              permitted by law, this company excludes all representations, warranties, conditions, and 
              terms relating to our website and the use of this website.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>8. Limitation of Liability</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              In no event shall ERP System, nor its directors, employees, partners, agents, suppliers, 
              or affiliates, be liable for any indirect, incidental, special, consequential, or 
              punitive damages, including without limitation, loss of profits, data, use, goodwill, 
              or other intangible losses, resulting from your use of the service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>9. Governing Law</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which 
              the company operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>10. Changes to Terms</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any 
              time. If a revision is material, we will provide at least 30 days notice prior to any 
              new terms taking effect.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>11. Contact Information</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              If you have any questions about these Terms of Service, please contact us through our 
              support channels or email us at support@erpsystem.com.
            </p>
          </section>
        </CardContent>
      </Card>
    </PublicContentLayout>
  )
}

export const Route = createFileRoute('/terms')({
  component: TermsOfService,
})
