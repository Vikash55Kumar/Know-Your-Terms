import { Mail, Twitter, Github, Linkedin } from "lucide-react";
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo2.png';

export default function Footer() {
  const { t } = useTranslation();

  const quickLinks = [
    { href: '/', label: t('footer.quick_links.home') },
    { href: '/about', label: t('footer.quick_links.about') },
    { href: '/help', label: t('footer.quick_links.help') },
    { href: '/dashboard', label: t('footer.quick_links.dashboard') },
    { href: '/contact', label: t('footer.quick_links.contact') }
  ];

  const features = t('footer.features', { returnObjects: true }) as string[];

  return (
    <footer className="bg-gradient-to-br from-[#e8eaf6] via-[#f5f7fa] to-white border-t-2 border-[#1a237e]">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand Section */}
          <div>
            <div className="flex items-center mb-4">
              <img src={logo} alt={t('footer.brand.title')} className="h-14 w-14 mr-3  " />
              <div>
                <h2 className="text-xl font-bold text-[#1a237e]">{t('footer.brand.title')}</h2>
                <p className="text-[#283593] text-sm font-semibold">{t('footer.brand.subtitle')}</p>
              </div>
            </div>
            <p className="text-[#283593] text-sm leading-relaxed">
              {t('footer.brand.description')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[#1a237e] font-semibold text-lg mb-4">{t('footer.quick_links_title')}</h3>
            <ul className="space-y-3 text-[#283593] text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}><a href={link.href} className="hover:text-[#1a237e] transition">{link.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-[#1a237e] font-semibold text-lg mb-4">{t('footer.features_title')}</h3>
            <ul className="space-y-3 text-[#283593] text-sm">
              {features && features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="text-[#1a237e] font-semibold text-lg mb-4">{t('footer.contact.title')}</h3>
            <p className="text-[#283593] text-sm mb-4 flex items-center gap-2">
              <Mail size={16} className="text-[#1a237e]" /> support@knowyourterms.ai
            </p>
            <div className="flex gap-4 mt-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[#283593] hover:text-[#1a237e] transition">
                <Twitter size={20} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[#283593] hover:text-[#1a237e] transition">
                <Github size={20} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-[#283593] hover:text-[#1a237e] transition">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t-2 border-[#1a237e]/20 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-[#283593] text-sm font-medium mb-2">
              {t('footer.bottom.copyright', { year: new Date().getFullYear() })}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[#283593] text-xs">
              <span>{t('footer.bottom.last_updated')}</span>
              <span>•</span>
              <span>{t('footer.bottom.version')}</span>
              <span>•</span>
              <span>{t('footer.bottom.best_viewed')}</span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-[#1a237e] text-sm font-semibold flex items-center gap-1">
              <span aria-hidden>🤖</span> <span>{t('footer.bottom.powered_by')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <img src={logo} alt={t('footer.brand.title')} className="h-6 w-6 rounded" />
              <span className="text-[#1a237e] text-sm font-medium">{t('footer.bottom.secure_private')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
