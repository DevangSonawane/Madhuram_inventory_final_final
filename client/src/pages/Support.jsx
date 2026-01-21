import React from 'react';
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Phone, 
  FileQuestion,
  ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/PageTransition';

export default function Support() {
  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers, documentation, and get in touch with our team.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5 text-primary" />
                Documentation
              </CardTitle>
              <CardDescription>
                Comprehensive guides on how to use the inventory system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                <li>Getting Started Guide</li>
                <li>Managing Inventory Items</li>
                <li>Processing Purchase Orders</li>
                <li>Generating Reports</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View Documentation <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Live Chat
              </CardTitle>
              <CardDescription>
                Chat with our support team for immediate assistance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Available Monday to Friday, 9:00 AM - 6:00 PM IST.
                Current wait time: ~5 minutes.
              </p>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button className="w-full">Start Chat</Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Reach out via email or phone for complex issues.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Email:</span>
                <a href="mailto:support@madhuram.com" className="text-primary hover:underline">support@madhuram.com</a>
              </div>
              <div className="flex items-center justify-between">
                <span>Phone:</span>
                <a href="tel:+911234567890" className="text-primary hover:underline">+91 123 456 7890</a>
              </div>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button variant="secondary" className="w-full">Open Ticket</Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                <AccordionContent>
                  Go to Settings &gt; Security to change your password. If you cannot log in, use the "Forgot Password" link on the login page.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>How do I export reports?</AccordionTrigger>
                <AccordionContent>
                  Navigate to the Reports page. Select the desired report type and date range, then click the "Export PDF" or "Export Excel" button in the top right corner.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Can I add custom categories for materials?</AccordionTrigger>
                <AccordionContent>
                  Yes, administrators can manage material categories in the System Configuration section. Contact your admin if you don't have access.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>What happens when stock reaches zero?</AccordionTrigger>
                <AccordionContent>
                  The item status changes to "Out of Stock" automatically. If configured, a notification is sent to the warehouse manager and purchasing department.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-center pt-6">
        <p className="text-xs text-muted-foreground">
          Madhuram Inventory v1.0.0 • © 2024 Madhuram Management. All rights reserved.
        </p>
      </motion.div>
    </motion.div>
  );
}
