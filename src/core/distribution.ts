export interface DistributionConfig {
  id: string
  productName: string
  institution: string
  platformName: string
  poweredBy: string
  version: string
  storage: {
    databaseName: string
  }
  theme: {
    primary: string
    primaryDark: string
    primarySoft: string
    accent: string
  }
  pwa: {
    description: string
    icon: string
  }
}
