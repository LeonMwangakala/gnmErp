import { createFileRoute } from '@tanstack/react-router'
import { PublicContentLayout } from '@/features/auth/public-content-layout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function PrivacyPolicy() {
  return (
    <PublicContentLayout>
      <Card>
        <CardHeader>
          <CardTitle className='text-2xl'>Privacy Policy</CardTitle>
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
            <h2 className='mb-3 text-lg font-semibold'>1. Introduction</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              ERP System ("we", "our", or "us") is committed to protecting your privacy. This Privacy 
              Policy explains how we collect, use, disclose, and safeguard your information when you use 
              our service. Please read this privacy policy carefully. If you do not agree with the terms 
              of this privacy policy, please do not access the service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>2. Information We Collect</h2>
            <p className='mb-3 text-sm leading-relaxed text-muted-foreground'>
              We collect information that you provide directly to us, including:
            </p>
            <ul className='ml-6 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground'>
              <li><strong>Personal Information:</strong> Name, email address, phone number, and other contact information</li>
              <li><strong>Account Information:</strong> Username, password, and account preferences</li>
              <li><strong>Business Information:</strong> Company name, business address, and related business data</li>
              <li><strong>Usage Data:</strong> Information about how you use our service, including access times and features used</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>3. How We Use Your Information</h2>
            <p className='mb-3 text-sm leading-relaxed text-muted-foreground'>
              We use the information we collect to:
            </p>
            <ul className='ml-6 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground'>
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our service</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>4. Information Sharing and Disclosure</h2>
            <p className='mb-3 text-sm leading-relaxed text-muted-foreground'>
              We do not sell, trade, or rent your personal information to third parties. We may share 
              your information only in the following circumstances:
            </p>
            <ul className='ml-6 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground'>
              <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition</li>
              <li><strong>With Your Consent:</strong> We may share your information with your consent or at your direction</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>5. Data Security</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              We implement appropriate technical and organizational security measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction. 
              However, no method of transmission over the Internet or electronic storage is 100% secure, 
              and we cannot guarantee absolute security.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>6. Data Retention</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              We retain your personal information for as long as necessary to fulfill the purposes 
              outlined in this Privacy Policy, unless a longer retention period is required or 
              permitted by law. When we no longer need your personal information, we will securely 
              delete or anonymize it.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>7. Your Rights and Choices</h2>
            <p className='mb-3 text-sm leading-relaxed text-muted-foreground'>
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className='ml-6 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground'>
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Objection:</strong> Object to processing of your personal information</li>
              <li><strong>Portability:</strong> Request transfer of your personal information</li>
              <li><strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>8. Cookies and Tracking Technologies</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              We use cookies and similar tracking technologies to track activity on our service and 
              hold certain information. You can instruct your browser to refuse all cookies or to 
              indicate when a cookie is being sent. However, if you do not accept cookies, you may 
              not be able to use some portions of our service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>9. Children's Privacy</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              Our service is not intended for children under the age of 18. We do not knowingly collect 
              personal information from children under 18. If you are a parent or guardian and believe 
              that your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>10. International Data Transfers</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              Your information may be transferred to and maintained on computers located outside of your 
              state, province, country, or other governmental jurisdiction where data protection laws 
              may differ. By using our service, you consent to the transfer of your information to our 
              facilities and those third parties with whom we share it as described in this policy.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>11. Changes to This Privacy Policy</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              We may update our Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date. You are 
              advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className='mb-3 text-lg font-semibold'>12. Contact Us</h2>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className='mt-3 text-sm leading-relaxed text-muted-foreground'>
              <p>Email: privacy@erpsystem.com</p>
              <p>Address: [Your Company Address]</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </PublicContentLayout>
  )
}

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})
