"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Mail, Check, Trash2 } from "lucide-react";

const PROVIDERS = [
  { value: "gmail", label: "Gmail", host: "smtp.gmail.com", port: 587 },
  { value: "outlook", label: "Outlook / Office365", host: "smtp.office365.com", port: 587 },
  { value: "yahoo", label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 587 },
  { value: "custom", label: "Custom SMTP", host: "", port: 587 },
];

export default function SettingsPage() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [provider, setProvider] = useState("gmail");
  const [email, setEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetch("/api/settings/smtp")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured) {
          setConfigured(true);
          setCurrentEmail(data.email);
          setEmail(data.email);
          setSmtpHost(data.smtp_host);
          setSmtpPort(data.smtp_port);
          setProvider(data.provider || "gmail");
          setUpdatedAt(data.updated_at);
        }
        setLoading(false);
      });
  }, []);

  const handleProviderChange = (value: string | null) => {
    if (!value) return;
    setProvider(value);
    const providerConfig = PROVIDERS.find((p) => p.value === value);
    if (providerConfig && value !== "custom") {
      setSmtpHost(providerConfig.host);
      setSmtpPort(providerConfig.port);
    }
  };

  const handleSave = async () => {
    if (!email || !password || !smtpHost) {
      toast.add({ title: "Fill all required fields", type: "error" });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_password: password,
        provider,
      }),
    });

    if (res.ok) {
      toast.add({ title: "SMTP settings saved", type: "success" });
      setConfigured(true);
      setCurrentEmail(email);
      setPassword("");
    } else {
      toast.add({ title: "Failed to save settings", type: "error" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    await fetch("/api/settings/smtp", { method: "DELETE" });
    toast.add({ title: "SMTP settings removed", type: "success" });
    setConfigured(false);
    setCurrentEmail("");
    setEmail("");
    setPassword("");
  };

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your email sending credentials.
        </p>
      </div>

      {/* Current status */}
      {configured && (
        <Card className="border-green-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email configured</p>
                  <p className="text-xs text-muted-foreground">{currentEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">{provider}</Badge>
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SMTP Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {configured ? "Update SMTP Settings" : "Configure Email Sending"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Provider</label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Address *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@gmail.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMTP Host</label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                disabled={provider !== "custom"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMTP Port</label>
              <Input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                placeholder="587"
                disabled={provider !== "custom"}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">App Password *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={configured ? "Enter new password to update" : "Your app password"}
            />
            <p className="text-xs text-muted-foreground">
              {provider === "gmail" && "Generate at: Google Account → Security → 2-Step Verification → App Passwords"}
              {provider === "outlook" && "Generate at: Microsoft Account → Security → App Passwords"}
              {provider === "yahoo" && "Generate at: Yahoo Account → Security → App Passwords"}
              {provider === "custom" && "Enter your SMTP password"}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !email || !password}>
            {saving ? "Saving..." : configured ? "Update Settings" : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
