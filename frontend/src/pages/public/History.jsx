import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_HISTORY = {
  subtitle: "From a small living room in San Ramon to a global learning platform — here's the story so far.",
  milestones: [
    {
      year: '2018',
      title: 'The Beginning',
      description:
        'Arintu was founded in San Ramon, California by Shiv Kayal and a small group of educators who believed that geography should never be a barrier to a world-class education. The first cohort of 12 students joined from three countries.',
    },
    {
      year: '2019',
      title: 'First 100 Students',
      description:
        'Word spread quickly. By the end of 2019, Arintu had enrolled over 100 students across India, Nepal, and the United States. The team grew to include five dedicated teachers and an operations coordinator.',
    },
    {
      year: '2020',
      title: 'Going Fully Online',
      description:
        'When the global pandemic forced classrooms to close, Arintu pivoted fast. The entire program moved online within two weeks. What was initially a constraint became a strength — suddenly learners anywhere in the world could attend. Enrollment tripled.',
    },
    {
      year: '2021',
      title: '10+ Countries',
      description:
        'Arintu expanded its footprint to over ten countries. Country-specific pricing was introduced to ensure that quality learning remained accessible regardless of economic background. A dedicated scholarship fund was established.',
    },
    {
      year: '2022',
      title: 'Scholarship Program Launch',
      description:
        'Formalising what had been an informal arrangement, Arintu launched a structured scholarship program. Every class now reserves 20% of its seats for scholarship recipients — full or partial — chosen by the super admin.',
    },
    {
      year: '2023',
      title: '5,000 Learners',
      description:
        'A milestone year. Arintu crossed 5,000 active learners, running over 40 concurrent classes taught by a faculty of 30+ teachers. Ashish Mathur joined as VP of Technology to lead the next phase of platform development.',
    },
    {
      year: '2024',
      title: 'AI-Assisted Learning',
      description:
        'Arintu introduced its first AI-powered features: personalised practice recommendations, automatic progress summaries, and a smart scheduling assistant. The platform infrastructure was rebuilt from the ground up to support the next ten years of growth.',
    },
    {
      year: '2025',
      title: 'Community & Beyond',
      description:
        'Arintu Online and Enfinitty Circle launched — connecting learners, alumni, and educators in a vibrant global community. The Book Club was introduced, giving every member a voice in shaping the curriculum. The journey continues.',
    },
  ],
};

export default function History() {
  const { data } = useSiteContent('history', DEFAULT_HISTORY);
  const { subtitle, milestones } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Our History</h1>
      <p className="text-gray-500 mb-12">{subtitle}</p>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[68px] top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-10">
          {(milestones || []).map((m, i) => (
            <div key={i} className="flex gap-6">
              {/* Year badge */}
              <div className="shrink-0 w-[60px] text-right">
                <span className="inline-block bg-brand-600 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  {m.year}
                </span>
              </div>

              {/* Dot */}
              <div className="shrink-0 w-5 flex flex-col items-center pt-1">
                <div className="w-3 h-3 rounded-full bg-brand-500 border-2 border-white ring-2 ring-brand-200 z-10" />
              </div>

              {/* Content */}
              <div className="pb-2">
                <h3 className="font-semibold text-gray-900 mb-1">{m.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
