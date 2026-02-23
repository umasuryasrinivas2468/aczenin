import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock3, FileText, ShieldCheck } from "lucide-react";

const timeline = [
  {
    title: "Patent Application Submitted",
    status: "Completed",
    description:
      "Patent application submitted under the Indian patent framework with complete technical specification.",
    icon: CheckCircle2,
  },
  {
    title: "Publication and Examination Queue",
    status: "In Progress",
    description:
      "Application has entered publication and examination workflow as per office timelines.",
    icon: Clock3,
  },
  {
    title: "Examination Response Cycle",
    status: "Upcoming",
    description:
      "Technical clarifications and formal responses are prepared for examination observations.",
    icon: FileText,
  },
  {
    title: "Final Determination",
    status: "Upcoming",
    description:
      "Final determination by the patent office after examination responses and clarifications.",
    icon: ShieldCheck,
  },
];

const getStatusStyles = (status: string) => {
  if (status === "Completed") {
    return "bg-green-100 text-green-700 border-green-200";
  }
  if (status === "In Progress") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
};

const Patent = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-smebank-50/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Patent</span>
          </div>
        </div>

        <section className="container mx-auto px-4 mb-14">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-smebank-100 text-smebank-700 hover:bg-smebank-100">
              Patent Pending Technology
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Patent Progress
            </h1>
            <p className="text-lg text-gray-600">
              Patent application filed with the Controller General of Patents and under process.
              This page shares transparent status updates for partners and users.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-14">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-gray-700">Patent Type</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xl font-semibold text-gray-900">Utility Patent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-gray-700">Jurisdiction</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xl font-semibold text-gray-900">India</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-gray-700">Current Stage</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xl font-semibold text-gray-900">Examination Queue</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Patent Application Timeline</h2>
            <div className="space-y-4">
              {timeline.map((item) => (
                <Card key={item.title}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <item.icon className="h-5 w-5 mt-1 text-smebank-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                      </div>
                      <Badge className={getStatusStyles(item.status)}>{item.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Patent;
