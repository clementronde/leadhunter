'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/components/ui'
import {
  Settings,
  Database,
  Key,
  Globe,
  Bell,
  Download,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'

export default function SettingsPage() {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus('idle')
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (supabaseUrl && supabaseKey) {
      setConnectionStatus('success')
    } else {
      setConnectionStatus('error')
    }
    
    setTestingConnection(false)
  }

  const handleExportData = () => {
    // In a real app, this would export leads as CSV/JSON
    alert('Export des données en cours...')
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Paramètres" 
        subtitle="Configurez votre application"
      />
      
      <div className="p-6 max-w-4xl space-y-6">
        {/* Database connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de données Supabase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Mode démonstration actif</p>
                <p className="text-sm text-amber-700 mt-1">
                  L'application fonctionne actuellement avec des données fictives. 
                  Connectez une base Supabase pour persister vos données.
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">URL du projet Supabase</label>
                <Input
                  placeholder="https://xxxxx.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  icon={<Globe className="h-4 w-4" />}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Clé API (anon/public)</label>
                <Input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  icon={<Key className="h-4 w-4" />}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={handleTestConnection}
                loading={testingConnection}
                variant="outline"
              >
                Tester la connexion
              </Button>
              
              {connectionStatus === 'success' && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Connexion réussie</span>
                </div>
              )}
              
              {connectionStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Échec de la connexion</span>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-zinc-200">
              <p className="text-sm text-zinc-500 mb-3">
                <strong>Instructions:</strong>
              </p>
              <ol className="text-sm text-zinc-600 space-y-2 list-decimal list-inside">
                <li>
                  Créez un projet gratuit sur{' '}
                  <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    supabase.com <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </li>
                <li>Copiez l'URL et la clé anon depuis Settings → API</li>
                <li>Exécutez le schéma SQL (fichier <code className="bg-zinc-100 px-1 rounded">supabase-schema.sql</code>)</li>
                <li>Ajoutez les variables d'environnement à votre <code className="bg-zinc-100 px-1 rounded">.env.local</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Clés API externes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              Ces APIs sont optionnelles mais recommandées pour des résultats optimaux.
            </p>
            
            <div className="space-y-4">
              <ApiKeyRow
                name="Google Places API"
                description="Recherche d'entreprises locales"
                status="not_configured"
                docsUrl="https://developers.google.com/maps/documentation/places/web-service"
              />
              <ApiKeyRow
                name="PageSpeed Insights API"
                description="Audit de performance des sites"
                status="free"
                docsUrl="https://developers.google.com/speed/docs/insights/v5/get-started"
              />
              <ApiKeyRow
                name="API Sirene (INSEE)"
                description="Base officielle des entreprises françaises"
                status="free"
                docsUrl="https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=V3&provider=insee"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">Nouveaux leads chauds</p>
                  <p className="text-sm text-zinc-500">Notification quand un lead avec score &gt; 80 est détecté</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
              </label>
              
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">Scan terminé</p>
                  <p className="text-sm text-zinc-500">Notification quand un scan est complété</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
              </label>
              
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">Rappels de suivi</p>
                  <p className="text-sm text-zinc-500">Rappel pour les leads non contactés depuis 7 jours</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Data management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Gestion des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4" />
                Exporter les leads (CSV)
              </Button>
              
              <Button variant="outline">
                <Upload className="h-4 w-4" />
                Importer des leads
              </Button>
              
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Supprimer toutes les données
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-zinc-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-zinc-900">LeadHunter</h3>
              <p className="text-sm text-zinc-500 mt-1">Version 1.0.0</p>
              <p className="text-sm text-zinc-500 mt-4">
                Développé pour Artichaud Studio
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ApiKeyRow({ 
  name, 
  description, 
  status, 
  docsUrl 
}: { 
  name: string
  description: string
  status: 'configured' | 'not_configured' | 'free'
  docsUrl: string
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
      <div>
        <p className="font-medium text-zinc-900">{name}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {status === 'configured' && (
          <Badge variant="success">Configuré</Badge>
        )}
        {status === 'not_configured' && (
          <Badge variant="secondary">Non configuré</Badge>
        )}
        {status === 'free' && (
          <Badge variant="info">Gratuit</Badge>
        )}
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600 hover:text-amber-700"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}
