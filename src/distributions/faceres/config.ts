import type { DistributionConfig } from '../../core/distribution.ts'

export const distributionConfig: DistributionConfig = {
  id: 'faceres',
  productName: 'FACERES Quiz',
  institution: 'FACERES',
  platformName: 'JamQuest',
  poweredBy: 'Jam',
  version: '1.0.0',
  storage: {
    databaseName: 'faceres-quiz',
  },
  theme: {
    primary: '#c51d37',
    primaryDark: '#861126',
    primarySoft: '#fff0f3',
    accent: '#ffc52f',
  },
  pwa: {
    description: 'Quiz de gincana da FACERES para uso em sala.',
    icon: 'faceres-quiz-icon.svg',
  },
}
