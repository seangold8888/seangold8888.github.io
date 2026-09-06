param([string]$SourceDirectory, [string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class AttackAtlas {
  public static void Process(string input, string output) {
    using(var source=new Bitmap(input)) {
      int w=source.Width,h=source.Height,n=w*h;
      using(var bmp=new Bitmap(w,h,PixelFormat.Format32bppArgb)) {
        using(var g=Graphics.FromImage(bmp))g.DrawImageUnscaled(source,0,0);
        var data=bmp.LockBits(new Rectangle(0,0,w,h),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
        byte[] px=new byte[n*4];Marshal.Copy(data.Scan0,px,0,px.Length);
        bool[] gray=new bool[n],seen=new bool[n];int[] queue=new int[n];
        for(int p=0;p<n;p++){int k=p*4;int lo=Math.Min(px[k],Math.Min(px[k+1],px[k+2]));int hi=Math.Max(px[k],Math.Max(px[k+1],px[k+2]));gray[p]=lo>=192&&hi-lo<=24;}
        // Flood-fill neutral checkerboard regions; enclosed costume whites remain opaque.
        for(int p=0;p<n;p++)if(gray[p]&&!seen[p]){
          int head=0,tail=0;queue[tail++]=p;seen[p]=true;bool border=false;int dark=0,light=0;
          while(head<tail){int q=queue[head++],x=q%w,y=q/w,k=q*4;int v=(px[k]+px[k+1]+px[k+2])/3;
            if(x==0||y==0||x==w-1||y==h-1)border=true;if(v<242)dark++;if(v>249)light++;
            for(int d=0;d<4;d++){int t=d==0?q-1:d==1?q+1:d==2?q-w:q+w;if(t<0||t>=n||(d==0&&x==0)||(d==1&&x==w-1))continue;if(gray[t]&&!seen[t]){seen[t]=true;queue[tail++]=t;}}
          }
          if(border||(tail>90&&dark>24&&light>24))for(int j=0;j<tail;j++)px[queue[j]*4+3]=0;
        }
        // Find connected figures before packing: weapon tips can cross nominal cell boundaries.
        Array.Clear(seen,0,n);int[] owner=new int[n];for(int i=0;i<n;i++)owner[i]=-1;
        var components=new List<int[]>();
        for(int p=0;p<n;p++)if(px[p*4+3]>0&&!seen[p]){
          int head=0,tail=0;queue[tail++]=p;seen[p]=true;
          while(head<tail){int q=queue[head++],x=q%w;for(int d=0;d<4;d++){int t=d==0?q-1:d==1?q+1:d==2?q-w:q+w;if(t<0||t>=n||(d==0&&x==0)||(d==1&&x==w-1))continue;
            if(!seen[t]&&px[t*4+3]>0){seen[t]=true;queue[tail++]=t;}}}
          if(tail<5){for(int j=0;j<tail;j++)px[queue[j]*4+3]=0;continue;}
          int[] comp=new int[tail];Array.Copy(queue,comp,tail);components.Add(comp);
        }
        // Inspected contact seam in Mira's top row: preserve both silhouettes,
        // assigning the shared blade/boot boundary rather than deleting pixels.
        if(output.Contains("mira"))for(int i=components.Count-1;i>=0;i--){
          var comp=components[i];int left=w,right=0,bottom=0;foreach(int p in comp){left=Math.Min(left,p%w);right=Math.Max(right,p%w);bottom=Math.Max(bottom,p/w);}
          if(bottom<418&&right-left>650){var a=new List<int>();var b=new List<int>();foreach(int p in comp){int y=p/w;double seam=y<280?875:y<330?875-.2*(y-280):800;if(p%w<seam)a.Add(p);else b.Add(p);}components.RemoveAt(i);components.Add(a.ToArray());components.Add(b.ToArray());}
        }
        int[] counts=new int[9];double[] centerX=new double[9],centerY=new double[9];
        foreach(var comp in components)if(comp.Length>1800){double sx=0,sy=0;foreach(int p in comp){sx+=p%w;sy+=p/w;}sx/=comp.Length;sy/=comp.Length;int cell=Math.Min(2,(int)(sy/(h/3.0)))*3+Math.Min(2,(int)(sx/(w/3.0)));foreach(int p in comp)owner[p]=cell;centerX[cell]+=sx*comp.Length;centerY[cell]+=sy*comp.Length;counts[cell]+=comp.Length;}
        for(int c=0;c<9;c++){if(counts[c]==0)throw new Exception("Missing figure in cell "+c);centerX[c]/=counts[c];centerY[c]/=counts[c];}
        foreach(var comp in components)if(comp.Length<=1800){double sx=0,sy=0;foreach(int p in comp){sx+=p%w;sy+=p/w;}sx/=comp.Length;sy/=comp.Length;int best=0;double score=double.MaxValue;for(int c=0;c<9;c++){double d=Math.Pow(sx-centerX[c],2)+Math.Pow(sy-centerY[c],2);if(d<score){score=d;best=c;}}foreach(int p in comp)owner[p]=best;}
        int[] minX=new int[9],minY=new int[9],maxX=new int[9],maxY=new int[9];for(int c=0;c<9;c++){minX[c]=w;minY[c]=h;}
        for(int p=0;p<n;p++)if(owner[p]>=0){int c=owner[p],x=p%w,y=p/w;minX[c]=Math.Min(minX[c],x);minY[c]=Math.Min(minY[c],y);maxX[c]=Math.Max(maxX[c],x);maxY[c]=Math.Max(maxY[c],y);}
        double scale=1;for(int c=0;c<9;c++){scale=Math.Min(scale,394.0/(maxX[c]-minX[c]+1));scale=Math.Min(scale,378.0/(maxY[c]-minY[c]+1));}
        // Each frame is isolated before normalization; no neighboring weapon/feet can leak in.
        using(var atlas=new Bitmap(1254,1254,PixelFormat.Format32bppArgb))using(var g=Graphics.FromImage(atlas)){
          g.Clear(Color.Transparent);g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;g.CompositingMode=System.Drawing.Drawing2D.CompositingMode.SourceCopy;
          for(int c=0;c<9;c++){
            int bw=maxX[c]-minX[c]+1,bh=maxY[c]-minY[c]+1;double footX=0;int footN=0;
            using(var frame=new Bitmap(bw,bh,PixelFormat.Format32bppArgb)){
              var fd=frame.LockBits(new Rectangle(0,0,bw,bh),ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);byte[] fp=new byte[bw*bh*4];
              for(int y=minY[c];y<=maxY[c];y++)for(int x=minX[c];x<=maxX[c];x++){int p=y*w+x;if(owner[p]!=c)continue;int k=((y-minY[c])*bw+x-minX[c])*4;Array.Copy(px,p*4,fp,k,4);if(y>maxY[c]-15){footX+=x;footN++;}}
              Marshal.Copy(fp,0,fd.Scan0,fp.Length);frame.UnlockBits(fd);
              footX=footN>0?footX/footN:(minX[c]+maxX[c])/2.0;
              float fw=(float)(bw*scale),fh=(float)(bh*scale);
              float dx=(float)(209-(footX-minX[c])*scale);dx=Math.Max(10,Math.Min(408-fw,dx));
              g.DrawImage(frame,new RectangleF((c%3)*418+dx,(c/3)*418+390-fh,fw,fh),new RectangleF(0,0,bw,bh),GraphicsUnit.Pixel);
              Console.WriteLine("cell {0}: pixels={1}, bounds={2},{3},{4},{5}, scale={6:F3}",c,counts[c],minX[c],minY[c],bw,bh,scale);
            }
          }
          atlas.Save(output,ImageFormat.Png);
        }
        bmp.UnlockBits(data);
      }
    }
  }
}
'@
$files = @{
  lumi='exec-3b12215d-bf44-42c4-808e-385b740b6e93.png'
  mira='exec-e3f877ac-fd9c-4f31-883e-67d70954ca80.png'
  joy='exec-dbeb39cc-b842-4f7d-85f5-7e4095601fae.png'
}
foreach($hero in @('lumi','mira','joy')) {
  Write-Output $hero
  [AttackAtlas]::Process((Join-Path $SourceDirectory $files[$hero]),(Join-Path $OutputDirectory "$hero-attacks-v1.png"))
}
