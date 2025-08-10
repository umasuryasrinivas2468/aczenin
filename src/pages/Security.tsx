import { Shield, Lock, Eye, Fingerprint, Smartphone, AlertTriangle, CheckCircle, Key, Server, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Security = () => {
  const securityFeatures = [
    {
      icon: <Shield className="h-8 w-8 text-smebank-600" />,
      title: "Bank-Grade Encryption",
      description: "All your data is protected with 256-bit SSL encryption, the same standard used by leading financial institutions worldwide."
    },
    {
      icon: <Fingerprint className="h-8 w-8 text-smebank-600" />,
      title: "Biometric Authentication",
      description: "Secure your account with fingerprint and face recognition technology for quick and safe access to your banking services."
    },
    {
      icon: <Smartphone className="h-8 w-8 text-smebank-600" />,
      title: "Two-Factor Authentication",
      description: "Add an extra layer of security with SMS OTP, email verification, and authenticator app integration."
    },
    {
      icon: <Eye className="h-8 w-8 text-smebank-600" />,
      title: "Real-Time Monitoring",
      description: "Our advanced AI systems monitor your account 24/7 for suspicious activities and unauthorized access attempts."
    },
    {
      icon: <Server className="h-8 w-8 text-smebank-600" />,
      title: "Secure Infrastructure",
      description: "Our servers are hosted in tier-4 data centers with multiple layers of physical and digital security measures."
    },
    {
      icon: <Globe className="h-8 w-8 text-smebank-600" />,
      title: "Global Security Standards",
      description: "We comply with international security standards including ISO 27001, PCI DSS, and SOC 2 Type II certifications."
    }
  ];

  const securityTips = [
    {
      icon: <Key className="h-6 w-6 text-green-600" />,
      title: "Strong Passwords",
      description: "Use unique, complex passwords with a mix of letters, numbers, and special characters.",
      tips: [
        "Minimum 8 characters long",
        "Include uppercase and lowercase letters",
        "Add numbers and special characters",
        "Avoid personal information"
      ]
    },
    {
      icon: <Lock className="h-6 w-6 text-green-600" />,
      title: "Secure Banking Habits",
      description: "Follow best practices to keep your account safe from fraud and unauthorized access.",
      tips: [
        "Always log out after banking sessions",
        "Never share login credentials",
        "Use official banking apps only",
        "Check account statements regularly"
      ]
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-green-600" />,
      title: "Phishing Protection",
      description: "Learn to identify and avoid phishing attempts and fraudulent communications.",
      tips: [
        "Verify sender email addresses",
        "Don't click suspicious links",
        "Never share OTP with anyone",
        "Report suspicious activities immediately"
      ]
    }
  ];



  const securityMeasures = [
    "End-to-end encryption for all transactions",
    "Multi-layered firewall protection",
    "Regular security audits and penetration testing",
    "Secure API endpoints with rate limiting",
    "Data anonymization and pseudonymization",
    "Incident response and recovery procedures",
    "Employee security training and background checks",
    "Compliance with data protection regulations"
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-smebank-50 to-smeteal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-smebank-100 text-smebank-800 hover:bg-smebank-200">
              Security & Privacy
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Your Security is Our 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Top Priority
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              We employ cutting-edge security technologies and follow industry best practices 
              to protect your financial data and ensure safe banking experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-smebank-600 to-smeteal-600 hover:from-smebank-700 hover:to-smeteal-700 text-white px-8 py-3"
              >
                Security Center
                <Shield className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3">
                Report Security Issue
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Advanced Security Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Multiple layers of protection to keep your money and data safe from cyber threats.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-smebank-50 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Alert */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Security Notice:</strong> We will never ask for your login credentials, OTP, or card details 
                via phone, email, or SMS. Always verify communications through official channels and report 
                suspicious activities immediately.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </section>

      {/* Security Tips */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Security Best Practices
            </h2>
            <p className="text-lg text-gray-600">
              Follow these guidelines to enhance your account security and protect yourself from fraud.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {securityTips.map((tip, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-green-50 rounded-full mr-3">
                      {tip.icon}
                    </div>
                    <CardTitle className="text-xl">{tip.title}</CardTitle>
                  </div>
                  <CardDescription>{tip.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tip.tips.map((tipItem, idx) => (
                      <div key={idx} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{tipItem}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>



      {/* Security Measures */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="/placeholder.svg" 
                alt="Security Infrastructure" 
                className="rounded-lg shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-smebank-600/20 to-smeteal-600/20 rounded-lg"></div>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center">
                  <Shield className="h-6 w-6 text-green-500 mr-2" />
                  <div>
                    <div className="font-semibold text-gray-900">99.9% Uptime</div>
                    <div className="text-sm text-gray-600">Secure & Reliable</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Comprehensive Security Measures
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our multi-layered security approach ensures your data and transactions are protected 
                at every level, from infrastructure to application security.
              </p>
              <div className="space-y-4">
                {securityMeasures.map((measure, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{measure}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-smebank-600">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-smebank-100">System Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">256-bit</div>
              <div className="text-smebank-100">SSL Encryption</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-smebank-100">Security Monitoring</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">0</div>
              <div className="text-smebank-100">Data Breaches</div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-16 bg-red-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Security Emergency Contacts</h2>
            <p className="text-lg text-gray-600">Report security incidents immediately</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="border-red-200 bg-white text-center">
              <CardContent className="p-6">
                <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Fraud Hotline</h3>
                <p className="text-red-600 font-bold text-lg">1800-XXX-FRAUD</p>
                <p className="text-sm text-gray-500 mt-2">24/7 Available</p>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-white text-center">
              <CardContent className="p-6">
                <Lock className="h-8 w-8 text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Card Block</h3>
                <p className="text-red-600 font-bold text-lg">1800-XXX-BLOCK</p>
                <p className="text-sm text-gray-500 mt-2">Instant card blocking</p>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-white text-center">
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Security Email</h3>
                <p className="text-red-600 font-bold text-sm">security@aczen.tech</p>
                <p className="text-sm text-gray-500 mt-2">For detailed reports</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-smebank-600 to-smeteal-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Banking with Complete Peace of Mind
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Experience secure banking with our advanced security features and 24/7 protection. 
            Your financial safety is our commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-smebank-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            >
              Open Secure Account
              <Shield className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-smebank-600 px-8 py-3"
            >
              Learn More About Security
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Security;