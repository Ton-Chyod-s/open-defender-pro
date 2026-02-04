import { Card } from '../components/ui';
import './CleanerPage.css';

export function CleanerPage() {
  return (
    <div className="cleaner-page">
      <Card icon="🧹" title="Windows Cleaner" subtitle="Limpe arquivos temporários e otimize seu sistema">
        <div className="coming-soon">
          <div className="coming-soon__icon">🚧</div>
          <h3>Em Desenvolvimento</h3>
          <p>Esta funcionalidade estará disponível em breve.</p>
        </div>
      </Card>
    </div>
  );
}

export default CleanerPage;
