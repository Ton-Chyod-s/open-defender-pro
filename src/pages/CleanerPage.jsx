import { useState, useEffect } from 'react';
import { Card, Button, Spinner, AlertModal, ConfirmModal } from '../components/ui';
import { analyzeCleanup, runCleanup } from '../services/defenderApi';
import './CleanerPage.css';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function CleanerPage() {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState({});
  const [cleaningCategory, setCleaningCategory] = useState('');
  
  // Modal states
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertModal({ ...alertModal, isOpen: false });
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  useEffect(() => {
    handleAnalyze();
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const data = await analyzeCleanup();
      setAnalysis(data);
      // Define categorias selecionadas baseado no padrão
      const selected = {};
      data.categories.forEach(cat => {
        selected[cat.id] = cat.selected;
      });
      setSelectedCategories(selected);
    } catch (error) {
      console.error('Erro ao analisar:', error);
      showAlert('Erro', 'Não foi possível analisar o sistema: ' + error, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleCategory = (id) => {
    setSelectedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = {};
    analysis?.categories.forEach(cat => {
      allSelected[cat.id] = true;
    });
    setSelectedCategories(allSelected);
  };

  const handleDeselectAll = () => {
    const allDeselected = {};
    analysis?.categories.forEach(cat => {
      allDeselected[cat.id] = false;
    });
    setSelectedCategories(allDeselected);
  };

  const handleClean = async () => {
    const categoriesToClean = Object.entries(selectedCategories)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    if (categoriesToClean.length === 0) {
      showAlert('Aviso', 'Selecione pelo menos uma categoria para limpar.', 'warning');
      return;
    }

    const selectedSize = getSelectedSize();
    const selectedCount = getSelectedCount();

    showConfirm(
      'Confirmar Limpeza',
      `Deseja realmente limpar ${selectedCount.toLocaleString()} itens (${formatBytes(selectedSize)})?\n\nEsta ação não pode ser desfeita.`,
      () => {
        // Fecha o modal primeiro, depois inicia a limpeza
        closeConfirm();
        setTimeout(() => executeClean(categoriesToClean), 100);
      }
    );
  };

  const executeClean = async (categoriesToClean) => {
    setIsCleaning(true);
    setCleaningCategory('Preparando...');
    
    try {
      // Simula progresso mostrando categorias
      const categoryNames = {
        temp_files: 'Arquivos Temporários',
        windows_temp: 'Windows Temp',
        recycle_bin: 'Lixeira',
        chrome_cache: 'Cache do Chrome',
        brave_cache: 'Cache do Brave',
        edge_cache: 'Cache do Edge',
        firefox_cache: 'Cache do Firefox',
        windows_logs: 'Logs do Windows',
        prefetch: 'Prefetch',
        thumbnails: 'Miniaturas'
      };

      for (const cat of categoriesToClean) {
        setCleaningCategory(categoryNames[cat] || cat);
        await new Promise(r => setTimeout(r, 300)); // Pequeno delay visual
      }

      setCleaningCategory('Finalizando...');
      const cleanResult = await runCleanup(categoriesToClean);
      
      // Mostra resultado
      if (cleanResult.errors && cleanResult.errors.length > 0) {
        showAlert(
          'Limpeza Parcial',
          `Limpeza concluída com alguns avisos.\n\n✅ ${cleanResult.files_deleted.toLocaleString()} arquivos removidos\n💾 ${formatBytes(cleanResult.size_freed_bytes)} liberados\n\n⚠️ Alguns itens não puderam ser removidos (em uso pelo sistema).`,
          'warning'
        );
      } else {
        showAlert(
          'Limpeza Concluída!',
          `✅ ${cleanResult.files_deleted.toLocaleString()} arquivos removidos\n💾 ${formatBytes(cleanResult.size_freed_bytes)} liberados\n\nSeu sistema está mais limpo!`,
          'success'
        );
      }

      // Re-analisa após limpeza
      await handleAnalyze();
    } catch (error) {
      console.error('Erro ao limpar:', error);
      showAlert('Erro', 'Ocorreu um erro durante a limpeza: ' + error, 'error');
    } finally {
      setIsCleaning(false);
      setCleaningCategory('');
    }
  };

  const getSelectedSize = () => {
    if (!analysis) return 0;
    return analysis.categories
      .filter(cat => selectedCategories[cat.id])
      .reduce((sum, cat) => sum + cat.size_bytes, 0);
  };

  const getSelectedCount = () => {
    if (!analysis) return 0;
    return analysis.categories
      .filter(cat => selectedCategories[cat.id])
      .reduce((sum, cat) => sum + cat.file_count, 0);
  };

  return (
    <div className="cleaner-page">
      {/* Modais */}
      <AlertModal 
        isOpen={alertModal.isOpen} 
        onClose={closeAlert} 
        title={alertModal.title} 
        message={alertModal.message} 
        type={alertModal.type} 
      />
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={closeConfirm} 
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title} 
        message={confirmModal.message} 
      />

      {/* Header com resumo */}
      <div className="cleaner-header">
        <div className="cleaner-header__info">
          <h2>🧹 Windows Cleaner</h2>
          <p>Limpe arquivos temporários e otimize seu sistema</p>
        </div>
        <div className="cleaner-header__actions">
          <Button 
            variant="secondary" 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || isCleaning}
          >
            🔄 Analisar
          </Button>
        </div>
      </div>

      {/* Loading de Limpeza */}
      {isCleaning && (
        <div className="cleaner-cleaning-overlay">
          <div className="cleaner-cleaning-modal">
            <Spinner size="large" />
            <h3>Limpando seu sistema...</h3>
            <p className="cleaner-cleaning-category">{cleaningCategory}</p>
            <p className="cleaner-cleaning-hint">Isso pode levar alguns segundos</p>
          </div>
        </div>
      )}

      {/* Loading de Análise */}
      {isAnalyzing && !isCleaning && (
        <Card icon="🔍" title="Analisando sistema...">
          <div className="cleaner-loading">
            <Spinner size="large" />
            <p>Verificando arquivos que podem ser removidos...</p>
          </div>
        </Card>
      )}

      {/* Lista de categorias */}
      {!isAnalyzing && !isCleaning && analysis && (
        <>
          <Card 
            icon="📊" 
            title="Itens para Limpeza"
            subtitle={`${formatBytes(analysis.total_size_bytes)} em ${analysis.total_file_count.toLocaleString()} itens encontrados`}
          >
            <div className="cleaner-actions-bar">
              <Button variant="ghost" size="small" onClick={handleSelectAll}>
                ☑️ Selecionar Todos
              </Button>
              <Button variant="ghost" size="small" onClick={handleDeselectAll}>
                ⬜ Desmarcar Todos
              </Button>
            </div>

            <div className="cleaner-categories">
              {analysis.categories.map(category => (
                <div 
                  key={category.id}
                  className={`cleaner-category ${selectedCategories[category.id] ? 'cleaner-category--selected' : ''}`}
                  onClick={() => handleToggleCategory(category.id)}
                >
                  <div className="cleaner-category__checkbox">
                    {selectedCategories[category.id] ? '☑️' : '⬜'}
                  </div>
                  <div className="cleaner-category__icon">
                    {category.icon}
                  </div>
                  <div className="cleaner-category__info">
                    <h4>{category.name}</h4>
                    <p>{category.description}</p>
                  </div>
                  <div className="cleaner-category__stats">
                    <span className="cleaner-category__size">{formatBytes(category.size_bytes)}</span>
                    <span className="cleaner-category__count">{category.file_count.toLocaleString()} itens</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Botão de limpeza */}
          <div className="cleaner-footer">
            <div className="cleaner-footer__summary">
              <span className="cleaner-footer__size">{formatBytes(getSelectedSize())}</span>
              <span className="cleaner-footer__label">selecionados ({getSelectedCount().toLocaleString()} itens)</span>
            </div>
            <Button 
              variant="primary" 
              size="large"
              onClick={handleClean}
              disabled={isCleaning || getSelectedCount() === 0}
            >
              {isCleaning ? (
                <>
                  <Spinner size="small" /> Limpando...
                </>
              ) : (
                <>🧹 Limpar Selecionados</>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default CleanerPage;
