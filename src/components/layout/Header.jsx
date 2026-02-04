import './Header.css';

export function Header({ title, children }) {
  return (
    <header className="page-header">
      <h2 className="page-header__title">{title}</h2>
      {children && <div className="page-header__actions">{children}</div>}
    </header>
  );
}

export default Header;
