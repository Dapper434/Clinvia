import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

/**
 * How patient data is handled, written for patients rather than lawyers.
 *
 * Everything on this page has to describe what the system actually does. If a claim here
 * stops being true — or a new kind of data starts being collected — this page changes
 * with it. Reachable signed out, so someone can read it before creating an account.
 */

const Section = ({ title, children }) => (
  <section className="border-t border-gray-100 pt-6">
    <h2 className="text-base font-bold text-gray-900">{title}</h2>
    <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-600">{children}</div>
  </section>
)

const List = ({ items }) => (
  <ul className="list-disc space-y-1.5 pl-5">
    {items.map((t) => <li key={t}>{t}</li>)}
  </ul>
)

export default function Privacy() {
  const navigate = useNavigate()
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={back}
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">How your data is protected</h1>
              <p className="text-sm text-gray-500">What Clinvia holds about you, who can see it, and what you can ask for.</p>
            </div>
          </div>

          <p className="mt-6 rounded-2xl bg-teal-50/60 p-4 text-sm leading-relaxed text-gray-700">
            Clinvia is the system your hospital uses to run your care. Your record belongs to your
            hospital: they decide who on their staff may open it, and they are who you contact about
            it. This page explains how the system keeps it safe.
          </p>

          <div className="mt-8 space-y-6">
            <Section title="What is kept about you">
              <p>Only what is needed to treat you and to run the clinic:</p>
              <List items={[
                'Who you are: your name, age, sex, phone number, email address and where you live.',
                'Your care: your weight, the kind of tuberculosis you are being treated for, your medicines and doses, lab results, appointments, ward stays, and the household contacts a nurse screens.',
                'What you record yourself: the daily doses you check in, appointments you book, and any document you upload.',
                'Your sign-in: your email address and your password, which is stored scrambled (hashed) so nobody — including the people who run Clinvia — can read it back.',
              ]} />
            </Section>

            <Section title="Who can see it">
              <p>Your record is tied to the hospital that registered you. Every time a page is opened, the system checks the person asking belongs to that hospital before it shows anything.</p>
              <List items={[
                'Your doctors, clinicians and nurses at your hospital see your full record, because they treat you.',
                'Reception staff see your contact and appointment details, not your clinical information.',
                'Hospital management sees counts and trends — how many patients, how treatment is going — not individual records.',
                'A network administrator keeps the service running across hospitals and can reach records to support it.',
                'Other hospitals using Clinvia cannot see your record at all.',
              ]} />
              <p>Your own portal account only ever opens your own record, and it stays connected to it by a one-time code your clinic gives you.</p>
            </Section>

            <Section title="How it is kept safe">
              <List items={[
                'Everything travels over an encrypted connection between your phone or computer and Clinvia.',
                'You have to sign in to reach anything, and your session is proven with a signed token that expires.',
                'Passwords are hashed with bcrypt, never stored or emailed as readable text. Staff accounts start with a temporary password that must be changed at first sign-in.',
                'The separation between hospitals is enforced by the system on every request, not by staff remembering to be careful.',
              ]} />
            </Section>

            <Section title="What is never done">
              <List items={[
                'Your information is never sold.',
                'It is never used for advertising.',
                'It is not shared with other hospitals on Clinvia.',
                'It is not shared with anyone outside your care unless your hospital is required to by law — for example reporting tuberculosis cases to the national programme, which hospitals must do.',
              ]} />
            </Section>

            <Section title="Dose reminders">
              <p>If you turn reminders on, your device shows a notification at your dose time on the days you have not yet logged a dose. It is sent to your device only — nobody else is told whether you took it.</p>
              <p>
                Be aware that a notification can appear on your lock screen, where someone else
                holding your phone could read it, and that the reminder currently names the
                treatment. If that is a concern, you can turn reminders off at any time from{' '}
                <em>My treatment</em>, or set your phone to hide notification contents on the lock
                screen.
              </p>
            </Section>

            <Section title="How long it is kept">
              <p>Your record is kept for as long as your hospital&apos;s medical records policy requires — health records are normally kept for years after treatment ends, because your treatment history matters if tuberculosis ever returns. Ask your hospital for the period they apply.</p>
            </Section>

            <Section title="What you can ask for">
              <p>You can ask your hospital to:</p>
              <List items={[
                'show you what is held about you,',
                'correct anything that is wrong, such as a misspelt name or an old phone number,',
                'explain who has had access to your record,',
                'close your portal account — this removes your sign-in, while your medical record stays with the hospital as their records policy requires.',
              ]} />
              <p>Ask at your clinic&apos;s reception, or tell the doctor or nurse who sees you. Under Kenya&apos;s Data Protection Act 2019, health information is sensitive personal data and you have the right to ask these questions.</p>
            </Section>

            <Section title="If something looks wrong">
              <p>If you think someone has seen your record who should not have, or you spot information that is not yours, tell your hospital as soon as you can so they can look into it.</p>
            </Section>
          </div>

          <p className="mt-8 border-t border-gray-100 pt-6 text-xs text-gray-400">
            Clinvia · Hospital management and tuberculosis care. Your hospital is the holder of your
            record; questions about it go to them.{' '}
            <Link to="/welcome" className="font-medium text-teal-700 hover:underline">Back to Clinvia</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
