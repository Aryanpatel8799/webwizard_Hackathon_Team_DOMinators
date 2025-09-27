import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Github, Twitter, Mail, Heart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Footer: React.FC = () => {
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  // Don't show footer on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900 border-t border-gray-800 mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">EventHub</span>
            </div>
            <p className="text-gray-400 text-sm">
              Discover and register for amazing events happening near you. 
              Built with modern technology for the best user experience.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Quick Links</h3>
            <div className="space-y-2">
              <Link 
                to="/" 
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Browse Events
              </Link>
              <Link 
                to="/#featured" 
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Featured Events
              </Link>
              <Link 
                to="/#categories" 
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Categories
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Support</h3>
            <div className="space-y-2">
              <a 
                href="#help" 
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Help Center
              </a>
              <a 
                href="#contact" 
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Contact Us
              </a>
              <a 
                href="#terms" 
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Terms of Service
              </a>
              <a 
                href="#privacy" 
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Privacy Policy
              </a>
            </div>
          </div>

          {/* Connect */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Connect</h3>
            <div className="flex gap-3">
              <a
                href="https://github.com"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="GitHub"
              >
                <Github className="w-5 h-5 text-gray-400" />
              </a>
              <a
                href="https://twitter.com"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Twitter"
              >
                <Twitter className="w-5 h-5 text-gray-400" />
              </a>
              <a
                href="mailto:support@eventhub.com"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Email"
              >
                <Mail className="w-5 h-5 text-gray-400" />
              </a>
            </div>
            <p className="text-gray-400 text-sm">
              Stay updated with our latest events and features
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} EventHub. All rights reserved.
            </p>
            
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-400 fill-current" />
              <span>for the community</span>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
