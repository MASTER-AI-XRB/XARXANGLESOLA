'use client'

import { useI18n } from '@/lib/i18n'
import Link from 'next/link'

export default function TermsPage() {
  const { t } = useI18n()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        {t('legal.terms.title')}
      </h1>
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          <strong>{t('legal.terms.lastUpdated')}:</strong> {new Date().toLocaleDateString('ca-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.terms.section1.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.terms.section1.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.terms.section2.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.terms.section2.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.terms.section3.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.terms.section3.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.terms.section4.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.terms.section4.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.terms.section5.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.terms.section5.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.terms.section6.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.terms.section6.content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('legal.terms.section7.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.terms.section7.content')}
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
