'use client'

import { useI18n } from '@/lib/i18n'
import Link from 'next/link'

export default function PrivacyPage() {
  const { t } = useI18n()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        {t('legal.privacy.title')}
      </h1>
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          <strong>{t('legal.privacy.lastUpdated')}:</strong> {new Date().toLocaleDateString('ca-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section1.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section1.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section2.title')}
          </h2>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
            <li>{t('legal.privacy.section2.item1')}</li>
            <li>{t('legal.privacy.section2.item2')}</li>
            <li>{t('legal.privacy.section2.item3')}</li>
            <li>{t('legal.privacy.section2.item4')}</li>
            <li>{t('legal.privacy.section2.item5')}</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section3.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section3.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section4.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section4.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section5.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section5.content')}
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
            <li>{t('legal.privacy.section5.right1')}</li>
            <li>{t('legal.privacy.section5.right2')}</li>
            <li>{t('legal.privacy.section5.right3')}</li>
            <li>{t('legal.privacy.section5.right4')}</li>
            <li>{t('legal.privacy.section5.right5')}</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section6.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section6.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section7.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section7.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.privacy.section8.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section8.content')}
          </p>
        </section>

        <div className="mt-8 pt-6 border-t dark:border-gray-700">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('common.back')}
          </Link>
        </div>
      </div>
    </div>
  )
}
