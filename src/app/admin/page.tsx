import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Swords, Wallet, AlertCircle, CheckCircle2, XCircle, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminPanel() {
  const pendingVerifications = [
    { id: 'v1', player1: 'SlayerX', player2: 'DragonKing', tournament: 'Titan Cup', reportedScore: '3-2', status: 'Pending AI' },
    { id: 'v2', player1: 'ProClash', player2: 'NoobStomper', tournament: 'Rising Stars', reportedScore: '2-3', status: 'Review Needed' },
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-black mb-1">COMMAND <span className="text-primary italic">CENTER</span></h1>
            <p className="text-muted-foreground">Manage tournaments, users, and financial records.</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <Button className="bg-primary hover:bg-primary/90">Create Tournament</Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Users</p>
              <p className="text-2xl font-black">12.5k</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Active Arenas</p>
              <p className="text-2xl font-black">42</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Pending Results</p>
              <p className="text-2xl font-black text-primary">12</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Revenue (MoM)</p>
              <p className="text-2xl font-black text-green-500">+12%</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="verifications" className="w-full">
          <TabsList className="bg-muted/50 border border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="verifications" className="data-[state=active]:bg-primary">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Match Verifications
            </TabsTrigger>
            <TabsTrigger value="tournaments">
              <Swords className="w-4 h-4 mr-2" /> Tournaments
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" /> User Management
            </TabsTrigger>
            <TabsTrigger value="wallets">
              <Wallet className="w-4 h-4 mr-2" /> Wallet Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verifications" className="mt-6">
            <Card className="glass border-white/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-headline">Pending Verifications</CardTitle>
                    <CardDescription>Verify match results using AI-assisted vision tools.</CardDescription>
                  </div>
                  <div className="relative w-48 hidden md:block">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search Match ID..." className="pl-8 h-8 text-xs bg-white/5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead>Match Info</TableHead>
                      <TableHead>Reported Score</TableHead>
                      <TableHead>AI Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVerifications.map((v) => (
                      <TableRow key={v.id} className="border-white/5">
                        <TableCell>
                          <p className="font-bold text-sm">{v.player1} vs {v.player2}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{v.tournament}</p>
                        </TableCell>
                        <TableCell className="font-mono text-primary font-bold">{v.reportedScore}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-yellow-500/20 text-yellow-500">
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-8 border-white/10">
                              <Eye className="w-3 h-3 mr-1" /> View Proof
                            </Button>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-500">
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tournaments" className="mt-6">
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-white/10">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-1">Tournament Management</h3>
              <p className="text-muted-foreground text-sm">Select a category or create a new arena setup.</p>
              <Button className="mt-6 bg-primary">Create New Tournament</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
